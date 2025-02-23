/*
  # Remove Admin Role and Update Policies

  1. Changes
    - Remove admin-specific policies
    - Update existing policies to remove admin role checks
    - Update achievements management to allow professors

  2. Security
    - Maintain RLS with updated policies
    - Ensure proper access control without admin role
*/

-- Update achievements policies to allow professors to manage achievements
DROP POLICY IF EXISTS "Admins can manage achievements" ON achievements;

CREATE POLICY "Professors can manage achievements"
  ON achievements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.professor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.professor_id = auth.uid()
    )
  );

-- Update user_profiles role check
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_role_check,
  ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('student', 'professor'));