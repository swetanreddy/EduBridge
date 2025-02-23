/*
  # Fix course professor relationship

  1. Changes
    - Update courses table to properly reference auth.users for professor_id
    - Add missing foreign key constraint

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing foreign key if it exists
ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS courses_professor_id_fkey;

-- Add proper foreign key constraint to auth.users
ALTER TABLE courses
  ADD CONSTRAINT courses_professor_id_fkey
  FOREIGN KEY (professor_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;