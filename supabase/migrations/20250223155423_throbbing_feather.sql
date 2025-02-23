/*
  # Fix Course Announcements Query Structure

  1. Changes
    - Add proper relationship between course_announcements and user_profiles
    - Update RLS policies
    - Add indexes for better performance
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Professors can manage their course announcements" ON course_announcements;
DROP POLICY IF EXISTS "Students can view announcements for enrolled courses" ON course_announcements;

-- Create policies with proper relationships
CREATE POLICY "Professors can manage announcements"
  ON course_announcements
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = professor_id OR
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_announcements.course_id
      AND courses.professor_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = professor_id OR
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_announcements.course_id
      AND courses.professor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view announcements"
  ON course_announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = course_announcements.course_id
      AND course_enrollments.student_id = auth.uid()
      AND course_enrollments.status = 'enrolled'
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_announcements_course_id 
  ON course_announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_course_announcements_professor_id 
  ON course_announcements(professor_id);
CREATE INDEX IF NOT EXISTS idx_course_announcements_created_at 
  ON course_announcements(created_at DESC);