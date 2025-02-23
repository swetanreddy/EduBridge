/*
  # Update assignments table type constraint

  1. Changes
    - Update type check constraint to match application values
    - Add index for type column
    - Add index for course_id for better join performance

  2. Security
    - Maintains existing RLS policies
*/

-- Drop existing type check constraint if it exists
ALTER TABLE assignments 
  DROP CONSTRAINT IF EXISTS assignments_type_check;

-- Add new type check constraint with correct values
ALTER TABLE assignments
  ADD CONSTRAINT assignments_type_check 
  CHECK (type IN ('multiple_choice', 'single_choice'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignments_type ON assignments(type);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);