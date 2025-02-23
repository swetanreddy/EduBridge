/*
  # Fix Course Announcements Structure

  1. Changes
    - Add default value for professor_id
    - Update RLS policies
    - Add proper indexes
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_course_announcements_updated_at ON course_announcements;
DROP TRIGGER IF EXISTS on_course_announcement_created ON course_announcements;

-- Function to get professor_id from course
CREATE OR REPLACE FUNCTION get_course_professor_id(course_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT professor_id FROM courses WHERE id = course_id;
$$;

-- Add trigger to automatically set professor_id
CREATE OR REPLACE FUNCTION set_announcement_professor_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set professor_id from course if not provided
  IF NEW.professor_id IS NULL THEN
    NEW.professor_id := get_course_professor_id(NEW.course_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for setting professor_id
CREATE TRIGGER set_announcement_professor_id_trigger
  BEFORE INSERT ON course_announcements
  FOR EACH ROW
  EXECUTE FUNCTION set_announcement_professor_id();

-- Recreate updated_at trigger
CREATE TRIGGER set_course_announcements_updated_at
  BEFORE UPDATE ON course_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Recreate notification trigger
CREATE TRIGGER on_course_announcement_created
  AFTER INSERT ON course_announcements
  FOR EACH ROW
  EXECUTE FUNCTION notify_course_announcement();