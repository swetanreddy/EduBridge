/*
  # Student Enrollment System

  1. Tables
    - student_enrollments
      - Tracks student enrollment status
      - Stores enrollment metadata
      - Handles enrollment requests

  2. Functions
    - check_enrollment_eligibility: Validates enrollment requests
    - request_enrollment: Handles enrollment process
    - handle_enrollment_response: Manages professor responses

  3. Security
    - RLS policies for proper access control
    - Security definer functions for sensitive operations
*/

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS check_enrollment_eligibility(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS request_enrollment(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS handle_enrollment_response(uuid, boolean) CASCADE;

-- Create enrollment status type
CREATE TYPE enrollment_status AS ENUM ('pending', 'enrolled', 'completed', 'dropped', 'rejected');

-- Create student enrollments table
CREATE TABLE IF NOT EXISTS student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  status enrollment_status NOT NULL DEFAULT 'pending',
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  grade numeric(5,2) CHECK (grade >= 0 AND grade <= 100),
  progress numeric(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  last_activity_at timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Enable RLS
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Students can view their own enrollments"
  ON student_enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can enroll themselves"
  ON student_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND status = 'pending'
  );

CREATE POLICY "Professors can manage enrollments"
  ON student_enrollments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = student_enrollments.course_id
      AND courses.professor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = student_enrollments.course_id
      AND courses.professor_id = auth.uid()
    )
  );

-- Function to check enrollment eligibility
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
  v_course_title text;
BEGIN
  -- Check if course exists and get details
  SELECT 
    EXISTS(SELECT 1 FROM courses WHERE id = p_course_id),
    c.max_students,
    c.start_date,
    c.title
  INTO 
    v_course_exists,
    v_course_max_students,
    v_course_start_date,
    v_course_title
  FROM courses c
  WHERE c.id = p_course_id;

  IF NOT v_course_exists THEN
    RETURN QUERY SELECT false::boolean, 'Course does not exist'::text;
    RETURN;
  END IF;

  -- Check if course has already started
  IF v_course_start_date < CURRENT_TIMESTAMP THEN
    RETURN QUERY SELECT false::boolean, 
      'Enrollment for ' || v_course_title || ' is closed as the course has already started'::text;
    RETURN;
  END IF;

  -- Check for existing enrollment
  SELECT status::text INTO v_existing_enrollment
  FROM student_enrollments
  WHERE course_id = p_course_id
    AND student_id = p_student_id;

  IF v_existing_enrollment IS NOT NULL THEN
    RETURN QUERY SELECT false::boolean, 
      CASE v_existing_enrollment
        WHEN 'enrolled' THEN 'You are already enrolled in ' || v_course_title
        WHEN 'pending' THEN 'Your enrollment request for ' || v_course_title || ' is pending approval'
        WHEN 'rejected' THEN 'Your previous enrollment request was rejected'
        ELSE 'You have a previous enrollment with status: ' || v_existing_enrollment
      END;
    RETURN;
  END IF;

  -- Get current enrollment count
  SELECT COUNT(*)
  INTO v_current_count
  FROM student_enrollments
  WHERE course_id = p_course_id
    AND status IN ('enrolled', 'pending');

  -- Check capacity
  IF v_current_count >= v_course_max_students THEN
    RETURN QUERY SELECT false::boolean, 
      v_course_title || ' has reached maximum capacity'::text;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT true::boolean, 'Eligible for enrollment in ' || v_course_title::text;
END;
$$;

-- Function to handle enrollment requests
CREATE OR REPLACE FUNCTION request_enrollment(
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
  v_course_title text;
  v_student_name text;
  v_professor_id uuid;
BEGIN
  -- Check if student exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_student_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid student ID'
    );
  END IF;

  -- Check eligibility
  SELECT * FROM check_enrollment_eligibility(p_course_id, p_student_id)
  INTO v_eligible, v_reason;

  IF NOT v_eligible THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', v_reason
    );
  END IF;

  -- Get course and student details
  SELECT 
    c.title,
    c.professor_id,
    up.name
  INTO 
    v_course_title,
    v_professor_id,
    v_student_name
  FROM courses c
  JOIN user_profiles up ON up.id = p_student_id
  WHERE c.id = p_course_id;

  -- Create enrollment request
  INSERT INTO student_enrollments (
    student_id,
    course_id,
    status
  ) VALUES (
    p_student_id,
    p_course_id,
    'pending'
  )
  RETURNING id INTO v_enrollment_id;

  -- Create notification for professor
  INSERT INTO notifications (
    recipient_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_professor_id,
    'enrollment_request',
    'New Enrollment Request',
    v_student_name || ' has requested to enroll in ' || v_course_title,
    jsonb_build_object(
      'course_id', p_course_id,
      'student_id', p_student_id,
      'enrollment_id', v_enrollment_id,
      'course_title', v_course_title,
      'student_name', v_student_name
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Your enrollment request for ' || v_course_title || ' has been submitted successfully'
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already have a pending enrollment request for this course'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'An error occurred while processing your request. Please try again.'
    );
END;
$$;

-- Function to handle enrollment responses
CREATE OR REPLACE FUNCTION handle_enrollment_response(
  p_enrollment_id uuid,
  p_approved boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_course_id uuid;
  v_course_title text;
  v_professor_id uuid;
BEGIN
  -- Get enrollment details
  SELECT 
    se.student_id,
    se.course_id,
    c.title,
    c.professor_id
  INTO 
    v_student_id,
    v_course_id,
    v_course_title,
    v_professor_id
  FROM student_enrollments se
  JOIN courses c ON c.id = se.course_id
  WHERE se.id = p_enrollment_id;

  -- Verify professor is making the request
  IF auth.uid() != v_professor_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized to respond to this enrollment request'
    );
  END IF;

  -- Update enrollment status
  UPDATE student_enrollments
  SET status = CASE WHEN p_approved THEN 'enrolled' ELSE 'rejected' END
  WHERE id = p_enrollment_id;

  -- Create notification for student
  INSERT INTO notifications (
    recipient_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_student_id,
    'enrollment_response',
    CASE WHEN p_approved 
      THEN 'Enrollment Approved'
      ELSE 'Enrollment Rejected'
    END,
    CASE WHEN p_approved 
      THEN 'Your enrollment in ' || v_course_title || ' has been approved'
      ELSE 'Your enrollment in ' || v_course_title || ' has been rejected'
    END,
    jsonb_build_object(
      'course_id', v_course_id,
      'course_title', v_course_title,
      'approved', p_approved
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN p_approved 
      THEN 'Enrollment approved successfully'
      ELSE 'Enrollment rejected successfully'
    END
  );
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id 
  ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_course_id 
  ON student_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_status 
  ON student_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_enrolled_at 
  ON student_enrollments(enrolled_at);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION request_enrollment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_enrollment_response(uuid, boolean) TO authenticated;