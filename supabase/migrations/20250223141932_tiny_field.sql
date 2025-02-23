/*
  # Fix Course Details Function and Policies

  1. Changes
    - Drop and recreate get_course_details function
    - Simplify policies to prevent recursion
    - Improve error handling
    - Add proper security contexts

  2. Security
    - Maintain RLS security
    - Add proper parameter handling
*/

-- Drop existing function first
DROP FUNCTION IF EXISTS get_course_details(uuid);

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Students can enroll in courses" ON course_enrollments;
DROP POLICY IF EXISTS "View own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Professors can update enrollment status" ON course_enrollments;
DROP POLICY IF EXISTS "student_insert" ON course_enrollments;
DROP POLICY IF EXISTS "student_select" ON course_enrollments;
DROP POLICY IF EXISTS "professor_select" ON course_enrollments;
DROP POLICY IF EXISTS "professor_update" ON course_enrollments;

-- Create base policies with no recursion
CREATE POLICY "student_insert"
  ON course_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND status = 'pending'
  );

CREATE POLICY "student_select"
  ON course_enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "professor_select"
  ON course_enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = course_enrollments.course_id
      AND professor_id = auth.uid()
    )
  );

CREATE POLICY "professor_update"
  ON course_enrollments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = course_enrollments.course_id
      AND professor_id = auth.uid()
    )
  );

-- Function to check enrollment eligibility
CREATE OR REPLACE FUNCTION check_enrollment_eligibility(
  p_course_id uuid,
  p_student_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_max_students integer;
  v_existing integer;
BEGIN
  -- Check for existing enrollment
  SELECT COUNT(*) INTO v_existing
  FROM course_enrollments
  WHERE course_id = p_course_id
  AND student_id = p_student_id;

  IF v_existing > 0 THEN
    RETURN false;
  END IF;

  -- Get course capacity
  SELECT max_students INTO v_max_students
  FROM courses
  WHERE id = p_course_id;

  -- Get current enrollment count
  SELECT COUNT(*) INTO v_count
  FROM course_enrollments
  WHERE course_id = p_course_id
  AND status IN ('enrolled', 'pending');

  RETURN v_count < v_max_students;
END;
$$;

-- Trigger function to enforce enrollment rules
CREATE OR REPLACE FUNCTION enforce_enrollment_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check eligibility
  IF NOT check_enrollment_eligibility(NEW.course_id, NEW.student_id) THEN
    RAISE EXCEPTION 'Enrollment not allowed: course is full or student already enrolled'
      USING HINT = 'Please check course capacity and existing enrollments';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS enforce_enrollment_rules_trigger ON course_enrollments;

-- Create new trigger
CREATE TRIGGER enforce_enrollment_rules_trigger
  BEFORE INSERT ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_enrollment_rules();

-- Create new get_course_details function with proper parameter naming
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
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.*,
    p.name as professor_name,
    COALESCE(e.count, 0)::bigint as student_count,
    ce.status as enrollment_status
  FROM courses c
  LEFT JOIN user_profiles p ON c.professor_id = p.id
  LEFT JOIN (
    SELECT course_id, COUNT(*) as count
    FROM course_enrollments
    WHERE status IN ('enrolled', 'pending')
    GROUP BY course_id
  ) e ON e.course_id = c.id
  LEFT JOIN course_enrollments ce ON 
    ce.course_id = c.id AND 
    ce.student_id = p_student_id;
END;
$$;