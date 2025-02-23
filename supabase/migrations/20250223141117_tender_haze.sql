/*
  # Fix Course Enrollment Policies and Constraints

  1. Changes
    - Fix infinite recursion in course enrollment policies
    - Add proper enrollment status checks
    - Improve capacity validation
    - Add proper enrollment constraints

  2. Security
    - Update RLS policies for better access control
    - Fix policy recursion issues
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Students can enroll themselves in courses" ON course_enrollments;

-- Create new enrollment policies with proper checks
CREATE POLICY "Students can enroll in available courses"
  ON course_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be the student themselves
    auth.uid() = student_id
    -- Status must be pending
    AND status = 'pending'
    -- Course must exist and have capacity
    AND EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id
      AND (
        SELECT COUNT(*)
        FROM course_enrollments ce
        WHERE ce.course_id = course_id
        AND ce.status IN ('enrolled', 'pending')
      ) < c.max_students
    )
    -- No existing enrollment
    AND NOT EXISTS (
      SELECT 1 FROM course_enrollments e2
      WHERE e2.course_id = course_id
      AND e2.student_id = student_id
    )
  );

-- Update existing view function to handle enrollment status properly
CREATE OR REPLACE FUNCTION public.get_course_details(student_id uuid)
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
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH enrollment_status AS (
    SELECT 
      ce.course_id,
      ce.status
    FROM course_enrollments ce
    WHERE ce.student_id = $1
  )
  SELECT 
    cd.*,
    es.status as enrollment_status
  FROM course_details cd
  LEFT JOIN enrollment_status es ON cd.id = es.course_id;
END;
$$;

-- Recreate capacity check function with better error handling
CREATE OR REPLACE FUNCTION check_course_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_students INTEGER;
BEGIN
  -- Get current enrollment count
  SELECT COUNT(*)
  INTO current_count
  FROM course_enrollments
  WHERE course_id = NEW.course_id
  AND status IN ('enrolled', 'pending');

  -- Get max students
  SELECT c.max_students
  INTO max_students
  FROM courses c
  WHERE c.id = NEW.course_id;

  -- Check capacity
  IF current_count >= max_students THEN
    RAISE EXCEPTION 'Course has reached maximum capacity'
      USING HINT = 'Please try enrolling in a different course or contact the professor';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;