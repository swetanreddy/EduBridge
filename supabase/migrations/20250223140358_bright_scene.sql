/*
  # Fix course relationships and add enrollment functionality

  1. Changes
    - Add course enrollment request status
    - Add enrollment notifications system

  2. Security
    - Add policies for enrollment notifications
*/

-- Update course_enrollments status options
ALTER TABLE course_enrollments
  DROP CONSTRAINT IF EXISTS course_enrollments_status_check,
  ADD CONSTRAINT course_enrollments_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'enrolled', 'completed', 'dropped'));

-- Add enrollment request notifications
CREATE TABLE IF NOT EXISTS enrollment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  professor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'unread',
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, student_id)
);

-- Enable RLS
ALTER TABLE enrollment_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for enrollment notifications
CREATE POLICY "Users can view their own notifications"
  ON enrollment_notifications
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id OR
    auth.uid() = professor_id
  );

CREATE POLICY "Users can update their own notifications"
  ON enrollment_notifications
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = student_id OR
    auth.uid() = professor_id
  )
  WITH CHECK (
    auth.uid() = student_id OR
    auth.uid() = professor_id
  );

-- Function to create enrollment notification
CREATE OR REPLACE FUNCTION create_enrollment_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO enrollment_notifications (course_id, student_id, professor_id)
  SELECT
    NEW.course_id,
    NEW.student_id,
    courses.professor_id
  FROM courses
  WHERE courses.id = NEW.course_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for enrollment notifications
CREATE TRIGGER on_enrollment_request
  AFTER INSERT ON course_enrollments
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION create_enrollment_notification();