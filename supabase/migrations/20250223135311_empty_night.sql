/*
  # Fix courses table structure

  1. Changes
    - Make start_date, end_date, and max_students NOT NULL
    - Add proper constraints for dates
    - Add trigger for updated_at

  2. Security
    - Update RLS policies to be more permissive for professors
*/

-- Ensure start_date, end_date, and max_students are NOT NULL
ALTER TABLE courses 
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date SET NOT NULL,
  ALTER COLUMN max_students SET NOT NULL;

-- Add constraint to ensure end_date is after start_date
ALTER TABLE courses
  ADD CONSTRAINT courses_dates_check 
  CHECK (end_date > start_date);

-- Create updated_at trigger for courses if it doesn't exist
CREATE TRIGGER set_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop existing RLS policies for courses
DROP POLICY IF EXISTS "Professors can manage their own courses" ON courses;
DROP POLICY IF EXISTS "Students can view courses" ON courses;
DROP POLICY IF EXISTS "Admins have full access to courses" ON courses;

-- Create new, more permissive policies
CREATE POLICY "Professors can manage their own courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = professor_id OR 
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.uid() = professor_id OR 
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Students can view all courses"
  ON courses
  FOR SELECT
  TO authenticated
  USING (true);