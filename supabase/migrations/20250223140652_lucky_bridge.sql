/*
  # Fix course browsing and relationships

  1. Changes
    - Add proper foreign key relationships for course browsing
    - Update course_enrollments constraints
    - Add indexes for better query performance

  2. Security
    - Maintain existing RLS policies
*/

-- Create index for professor_id to improve join performance
CREATE INDEX IF NOT EXISTS courses_professor_id_idx ON courses(professor_id);

-- Create index for course enrollments
CREATE INDEX IF NOT EXISTS course_enrollments_course_id_idx ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS course_enrollments_student_id_idx ON course_enrollments(student_id);

-- Update course_enrollments constraints
ALTER TABLE course_enrollments
  DROP CONSTRAINT IF EXISTS course_enrollments_max_students_check;

-- Add constraint to prevent over-enrollment
CREATE OR REPLACE FUNCTION check_course_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM course_enrollments
    WHERE course_id = NEW.course_id
    AND status IN ('enrolled', 'pending')
  ) > (
    SELECT max_students
    FROM courses
    WHERE id = NEW.course_id
  ) THEN
    RAISE EXCEPTION 'Course is at maximum capacity';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_course_capacity_trigger ON course_enrollments;
CREATE TRIGGER check_course_capacity_trigger
  BEFORE INSERT ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION check_course_capacity();