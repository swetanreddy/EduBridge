/*
  # Fix Course Enrollment Policies

  1. Changes
    - Fix infinite recursion in enrollment policies
    - Improve enrollment capacity checks
    - Add better error handling

  2. Security
    - Update RLS policies for course_enrollments
    - Add proper capacity validation
*/

-- Drop ALL existing enrollment policies to ensure clean slate
DROP POLICY IF EXISTS "Students can enroll themselves in courses" ON course_enrollments;
DROP POLICY IF EXISTS "Students can enroll in available courses" ON course_enrollments;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Professors can view enrollments for their courses" ON course_enrollments;

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

-- Add view policies
CREATE POLICY "Students can view their own enrollments"
  ON course_enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Professors can view enrollments for their courses"
  ON course_enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_enrollments.course_id
      AND courses.professor_id = auth.uid()
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