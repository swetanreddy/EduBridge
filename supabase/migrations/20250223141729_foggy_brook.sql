/*
  # Fix Course Enrollment Policies Recursion

  1. Changes
    - Fix infinite recursion in enrollment policies
    - Simplify policy checks to avoid recursion
    - Add proper update policies for professors

  2. Security
    - Maintain RLS security while avoiding recursion
    - Add explicit professor update permissions
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Students can enroll in available courses" ON course_enrollments;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Professors can view enrollments for their courses" ON course_enrollments;

-- Create simplified enrollment policy that avoids recursion
CREATE POLICY "Students can enroll in courses"
  ON course_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM course_enrollments e2
      WHERE e2.course_id = course_id
      AND e2.student_id = student_id
    )
  );

-- Create view policies
CREATE POLICY "View own enrollments"
  ON course_enrollments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_enrollments.course_id
      AND courses.professor_id = auth.uid()
    )
  );

-- Create update policy for professors
CREATE POLICY "Professors can update enrollment status"
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

-- Create trigger to enforce capacity limits
CREATE OR REPLACE FUNCTION enforce_course_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_students INTEGER;
BEGIN
  -- Get max students directly from courses
  SELECT max_students INTO max_students
  FROM courses
  WHERE id = NEW.course_id;

  -- Count current enrollments
  SELECT COUNT(*) INTO current_count
  FROM course_enrollments
  WHERE course_id = NEW.course_id
  AND status IN ('enrolled', 'pending');

  IF current_count >= max_students THEN
    RAISE EXCEPTION 'Course has reached maximum capacity'
      USING HINT = 'Please try enrolling in a different course or contact the professor';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_course_capacity_trigger ON course_enrollments;

-- Create new trigger
CREATE TRIGGER enforce_course_capacity_trigger
  BEFORE INSERT ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_course_capacity();