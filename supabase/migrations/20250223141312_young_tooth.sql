/*
  # Add Enrollment Notifications System

  1. Changes
    - Add notifications table for enrollment requests
    - Add notification status tracking
    - Add notification management functions

  2. Security
    - Enable RLS on notifications table
    - Add policies for professors and students
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create notification policies
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Function to create enrollment request notification
CREATE OR REPLACE FUNCTION create_enrollment_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  student_name text;
  course_title text;
BEGIN
  -- Get student name
  SELECT name INTO student_name
  FROM user_profiles
  WHERE id = NEW.student_id;

  -- Get course title
  SELECT title INTO course_title
  FROM courses
  WHERE id = NEW.course_id;

  -- Create notification for professor
  INSERT INTO notifications (
    recipient_id,
    type,
    title,
    message,
    data
  )
  SELECT
    courses.professor_id,
    'enrollment_request',
    'New Enrollment Request',
    student_name || ' has requested to enroll in ' || course_title,
    jsonb_build_object(
      'course_id', NEW.course_id,
      'student_id', NEW.student_id,
      'enrollment_id', NEW.id,
      'course_title', course_title,
      'student_name', student_name
    )
  FROM courses
  WHERE courses.id = NEW.course_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for enrollment request notifications
DROP TRIGGER IF EXISTS on_enrollment_request ON course_enrollments;
CREATE TRIGGER on_enrollment_request
  AFTER INSERT ON course_enrollments
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION create_enrollment_request_notification();

-- Function to handle enrollment approval/rejection
CREATE OR REPLACE FUNCTION handle_enrollment_response(
  enrollment_id uuid,
  approved boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_id uuid;
  course_id uuid;
  professor_id uuid;
  course_title text;
BEGIN
  -- Get enrollment details
  SELECT 
    ce.student_id,
    ce.course_id,
    c.professor_id,
    c.title
  INTO student_id, course_id, professor_id, course_title
  FROM course_enrollments ce
  JOIN courses c ON c.id = ce.course_id
  WHERE ce.id = enrollment_id;

  -- Verify professor is making the request
  IF auth.uid() != professor_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update enrollment status
  UPDATE course_enrollments
  SET status = CASE WHEN approved THEN 'enrolled' ELSE 'rejected' END
  WHERE id = enrollment_id;

  -- Create notification for student
  INSERT INTO notifications (
    recipient_id,
    type,
    title,
    message,
    data
  )
  VALUES (
    student_id,
    'enrollment_response',
    CASE WHEN approved 
      THEN 'Enrollment Approved'
      ELSE 'Enrollment Rejected'
    END,
    CASE WHEN approved 
      THEN 'Your enrollment in ' || course_title || ' has been approved'
      ELSE 'Your enrollment in ' || course_title || ' has been rejected'
    END,
    jsonb_build_object(
      'course_id', course_id,
      'course_title', course_title,
      'approved', approved
    )
  );
END;
$$;