/*
  # Update courses table schema

  1. Changes
    - Add start_date and end_date columns
    - Add max_students column
    - Add professor_id column if not exists
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to courses table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE courses ADD COLUMN start_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE courses ADD COLUMN end_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'max_students'
  ) THEN
    ALTER TABLE courses ADD COLUMN max_students integer CHECK (max_students > 0);
  END IF;
END $$;