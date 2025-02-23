/*
  # Fix Course Enrollment Functionality

  1. Changes
    - Drop and recreate enrollment functions with better error handling
    - Add validation for course start dates
    - Improve notification handling
    - Add proper RPC registration
    - Update indexes for better performance

  2. Security
    - All functions use SECURITY DEFINER
    - Proper schema search path set
    - RLS policies remain unchanged
*/

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS check_enrollment_eligibility(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS request_course_enrollment(uuid, uuid) CASCADE;

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
  SELECT status INTO v_existing_enrollment
  FROM course_enrollments
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
  FROM course_enrollments ce
  WHERE ce.course_id = p_course_id
    AND ce.status IN ('enrolled', 'pending');

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_compound 
  ON course_enrollments (course_id, student_id, status);

CREATE INDEX IF NOT EXISTS idx_courses_start_date 
  ON courses (start_date);

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION request_course_enrollment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_enrollment_eligibility(uuid, uuid) TO authenticated;