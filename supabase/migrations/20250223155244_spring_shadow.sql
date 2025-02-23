/*
  # Add Course Announcements

  1. New Tables
    - `course_announcements`
      - `id` (uuid, primary key)
      - `course_id` (uuid, references courses)
      - `professor_id` (uuid, references auth.users)
      - `title` (text)
      - `content` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for professors and enrolled students
    - Add function to create notifications for enrolled students
*/

-- Create course_announcements table
CREATE TABLE IF NOT EXISTS course_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  professor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE course_announcements ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER set_course_announcements_updated_at
  BEFORE UPDATE ON course_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Policies for course_announcements
CREATE POLICY "Professors can manage their course announcements"
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

CREATE POLICY "Students can view announcements for enrolled courses"
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

-- Function to create notifications for enrolled students
CREATE OR REPLACE FUNCTION notify_course_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_title text;
  v_professor_name text;
  v_student record;
BEGIN
  -- Get course and professor details
  SELECT 
    c.title,
    up.name
  INTO 
    v_course_title,
    v_professor_name
  FROM courses c
  JOIN user_profiles up ON up.id = NEW.professor_id
  WHERE c.id = NEW.course_id;

  -- Create notifications for enrolled students
  FOR v_student IN
    SELECT 
      ce.student_id,
      up.name as student_name,
      up.email
    FROM course_enrollments ce
    JOIN user_profiles up ON up.id = ce.student_id
    WHERE ce.course_id = NEW.course_id
      AND ce.status = 'enrolled'
  LOOP
    -- Insert notification
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      message,
      data
    ) VALUES (
      v_student.student_id,
      'course_announcement',
      'New Announcement: ' || NEW.title,
      'New announcement in ' || v_course_title || ' by ' || v_professor_name,
      jsonb_build_object(
        'course_id', NEW.course_id,
        'course_title', v_course_title,
        'announcement_id', NEW.id,
        'professor_name', v_professor_name
      )
    );

    -- Here you would typically integrate with your email service
    -- For this example, we'll log the email that would be sent
    RAISE NOTICE 'Would send email to %: New announcement in % - %',
      v_student.email,
      v_course_title,
      NEW.title;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for notifications
CREATE TRIGGER on_course_announcement_created
  AFTER INSERT ON course_announcements
  FOR EACH ROW
  EXECUTE FUNCTION notify_course_announcement();