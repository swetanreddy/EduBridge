/*
  # Add published flag to assignments

  1. Changes
    - Add published column to assignments table
    - Add index for published column
    - Update RLS policies to reflect new column

  2. Security
    - Maintains existing RLS policies
    - Students can only view published assignments
*/

-- Add published column to assignments
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS published boolean DEFAULT false;

-- Add index for published column
CREATE INDEX IF NOT EXISTS idx_assignments_published ON assignments(published);

-- Update RLS policies
DROP POLICY IF EXISTS "Students can view assignments for enrolled courses" ON assignments;

CREATE POLICY "Students can view published assignments"
  ON assignments
  FOR SELECT
  TO authenticated
  USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = assignments.course_id
      AND course_enrollments.student_id = auth.uid()
      AND course_enrollments.status = 'enrolled'
    )
  );