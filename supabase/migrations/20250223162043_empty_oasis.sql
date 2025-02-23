-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_course_professor_id(uuid);

-- Create view for course announcements with professor details
CREATE OR REPLACE VIEW course_announcements_with_professor AS
SELECT 
  ca.*,
  up.name as professor_name
FROM course_announcements ca
JOIN user_profiles up ON up.id = ca.professor_id;

-- Grant access to the view
GRANT SELECT ON course_announcements_with_professor TO authenticated;

-- Update the announcement list query function
CREATE OR REPLACE FUNCTION get_course_announcements(p_course_id uuid)
RETURNS TABLE (
  id uuid,
  course_id uuid,
  professor_id uuid,
  title text,
  content text,
  created_at timestamptz,
  updated_at timestamptz,
  professor_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM course_announcements_with_professor
  WHERE course_id = p_course_id
  ORDER BY created_at DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_course_announcements(uuid) TO authenticated;