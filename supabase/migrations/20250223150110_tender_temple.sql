/*
  # Fix Student Enrollment System

  1. Changes
    - Simplify enrollment process
    - Fix ambiguous column references
    - Add proper constraints and checks
    - Improve error handling
    - Add proper indexes

  2. Security
    - Maintain RLS policies
    - Add proper checks for enrollment status
*/

-- Drop existing functions and triggers for a clean slate
DROP FUNCTION IF EXISTS enforce_enrollment_rules() CASCADE;
DROP FUNCTION IF EXISTS check_enrollment_eligibility(uuid, uuid) CASCADE;
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
BEGIN
  -- Check if course exists
  SELECT EXISTS (
    SELECT 1 FROM courses WHERE id = p_course_id
  ) INTO v_course_exists;

  IF NOT v_course_exists THEN
    RETURN QUERY SELECT false::boolean, 'Course does not exist'::text;
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

  -- Get course capacity and current enrollment count
  SELECT 
    c.max_students,
    COALESCE(COUNT(ce.id), 0)::integer
  INTO v_course_max_students, v_current_count
  FROM courses c
  LEFT JOIN course_enrollments ce ON 
    ce.course_id = c.id AND 
    ce.status IN ('enrolled', 'pending')
  WHERE c.id = p_course_id
  GROUP BY c.max_students;

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
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eligible boolean;
  v_reason text;
  v_result json;
BEGIN
  -- Check eligibility
  SELECT * FROM check_enrollment_eligibility(p_course_id, p_student_id)
  INTO v_eligible, v_reason;

  IF NOT v_eligible THEN
    RETURN json_build_object(
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
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Enrollment request submitted successfully'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Already enrolled or pending enrollment'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'An error occurred: ' || SQLERRM
    );
END;
$$;

-- Create a function to get course details with enrollment status
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
  )
  SELECT 
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
    ce.status AS enrollment_status
  FROM courses c
  LEFT JOIN user_profiles p ON c.professor_id = p.id
  LEFT JOIN enrollment_counts ec ON ec.course_id = c.id
  LEFT JOIN course_enrollments ce ON 
    ce.course_id = c.id AND 
    ce.student_id = p_student_id
  ORDER BY c.created_at DESC;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_compound 
  ON course_enrollments (course_id, student_id, status);

-- Update RLS policies
DROP POLICY IF EXISTS "Students can enroll in courses" ON course_enrollments;
DROP POLICY IF EXISTS "View own enrollments" ON course_enrollments;

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