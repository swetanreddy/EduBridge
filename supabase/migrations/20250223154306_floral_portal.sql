/*
  # Fix Course Enrollment Logic

  1. Changes
    - Drop and recreate enrollment functions with fixed column references
    - Add better error handling and validation
    - Improve enrollment status tracking
    - Add proper indexes for performance
    - Update RLS policies

  2. Security
    - Maintain RLS on all tables
    - Add proper security context for functions
    - Ensure proper access control for enrollments
*/

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS check_enrollment_eligibility(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS request_course_enrollment(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_course_details(uuid) CASCADE;

-- Create a more robust enrollment check function
CREATE OR REPLACE FUNCTION check_enrollment_eligibility(
  p_course_id uuid,
  p_student_id uuid
)
RETURNS TABLE (
  eligible boolean,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_exists boolean;
  v_course_max_students integer;
  v_current_count integer;
  v_existing_enrollment text;
  v_course_start_date timestamptz;
BEGIN
  -- Check if course exists
  SELECT 
    EXISTS(SELECT 1 FROM courses WHERE id = p_course_id),
    c.max_students,
    c.start_date
  INTO 
    v_course_exists,
    v_course_max_students,
    v_course_start_date
  FROM courses c
  WHERE c.id = p_course_id;

  IF NOT v_course_exists THEN
    RETURN QUERY SELECT false::boolean, 'Course does not exist'::text;
    RETURN;
  END IF;

  -- Check if course has already started
  IF v_course_start_date < CURRENT_TIMESTAMP THEN
    RETURN QUERY SELECT false::boolean, 'Course has already started'::text;
    RETURN;
  END IF;

  -- Check for existing enrollment
  SELECT status INTO v_existing_enrollment
  FROM course_enrollments
  WHERE course_id = p_course_id
    AND student_id = p_student_id;

  IF v_existing_enrollment IS NOT NULL THEN
    RETURN QUERY SELECT false::boolean, 
      CASE v_existing_enrollment
        WHEN 'enrolled' THEN 'Already enrolled in this course'
        WHEN 'pending' THEN 'Enrollment request already pending'
        ELSE 'Previous enrollment exists with status: ' || v_existing_enrollment
      END;
    RETURN;
  END IF;

  -- Get current enrollment count
  SELECT COUNT(*)
  INTO v_current_count
  FROM course_enrollments ce
  WHERE ce.course_id = p_course_id
    AND ce.status IN ('enrolled', 'pending');

  -- Check capacity
  IF v_current_count >= v_course_max_students THEN
    RETURN QUERY SELECT false::boolean, 'Course has reached maximum capacity'::text;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT true::boolean, 'Eligible for enrollment'::text;
END;
$$;

-- Create a function to handle enrollment requests
CREATE OR REPLACE FUNCTION request_course_enrollment(
  p_course_id uuid,
  p_student_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eligible boolean;
  v_reason text;
  v_enrollment_id uuid;
BEGIN
  -- Check eligibility
  SELECT * FROM check_enrollment_eligibility(p_course_id, p_student_id)
  INTO v_eligible, v_reason;

  IF NOT v_eligible THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', v_reason
    );
  END IF;

  -- Create enrollment request
  INSERT INTO course_enrollments (
    course_id,
    student_id,
    status
  ) VALUES (
    p_course_id,
    p_student_id,
    'pending'
  )
  RETURNING id INTO v_enrollment_id;

  -- Create notification for the professor
  INSERT INTO notifications (
    recipient_id,
    type,
    title,
    message,
    data
  )
  SELECT
    c.professor_id,
    'enrollment_request',
    'New Enrollment Request',
    up.name || ' has requested to enroll in ' || c.title,
    jsonb_build_object(
      'course_id', p_course_id,
      'student_id', p_student_id,
      'enrollment_id', v_enrollment_id,
      'course_title', c.title,
      'student_name', up.name
    )
  FROM courses c
  JOIN user_profiles up ON up.id = p_student_id
  WHERE c.id = p_course_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Enrollment request submitted successfully',
    'enrollment_id', v_enrollment_id
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already enrolled or pending enrollment'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'An error occurred: ' || SQLERRM
    );
END;
$$;

-- Update get_course_details function with proper column references
CREATE OR REPLACE FUNCTION get_course_details(p_student_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  professor_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  start_date timestamptz,
  end_date timestamptz,
  max_students integer,
  professor_name text,
  student_count bigint,
  enrollment_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH enrollment_counts AS (
    SELECT 
      ce.course_id,
      COUNT(*) AS count
    FROM course_enrollments ce
    WHERE ce.status IN ('enrolled', 'pending')
    GROUP BY ce.course_id
  ),
  student_enrollment AS (
    SELECT 
      ce.course_id,
      ce.status
    FROM course_enrollments ce
    WHERE ce.student_id = p_student_id
  )
  SELECT DISTINCT ON (c.id)
    c.id,
    c.title,
    c.description,
    c.professor_id,
    c.created_at,
    c.updated_at,
    c.start_date,
    c.end_date,
    c.max_students,
    p.name AS professor_name,
    COALESCE(ec.count, 0)::bigint AS student_count,
    se.status AS enrollment_status
  FROM courses c
  LEFT JOIN user_profiles p ON c.professor_id = p.id
  LEFT JOIN enrollment_counts ec ON ec.course_id = c.id
  LEFT JOIN student_enrollment se ON se.course_id = c.id
  ORDER BY c.id, c.created_at DESC;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_course 
  ON course_enrollments (student_id, course_id);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_status 
  ON course_enrollments (status);

CREATE INDEX IF NOT EXISTS idx_courses_professor_id 
  ON courses (professor_id);

CREATE INDEX IF NOT EXISTS idx_courses_start_date 
  ON courses (start_date);

-- Update RLS policies
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_can_enroll" ON course_enrollments;
DROP POLICY IF EXISTS "view_enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "professors_can_manage_enrollments" ON course_enrollments;

CREATE POLICY "students_can_enroll"
  ON course_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id AND
    status = 'pending'
  );

CREATE POLICY "view_enrollments"
  ON course_enrollments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id OR
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_enrollments.course_id
      AND courses.professor_id = auth.uid()
    )
  );

CREATE POLICY "professors_can_manage_enrollments"
  ON course_enrollments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_enrollments.course_id
      AND courses.professor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_enrollments.course_id
      AND courses.professor_id = auth.uid()
    )
  );