-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Students can view materials" ON course_materials;
DROP POLICY IF EXISTS "Students can view published assignments" ON assignments;

-- Update course materials policy for enrolled students
CREATE POLICY "Students can view materials"
  ON course_materials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments
      WHERE student_enrollments.course_id = course_materials.course_id
      AND student_enrollments.student_id = auth.uid()
      AND student_enrollments.status = 'enrolled'
    )
  );

-- Update assignments policy for enrolled students
CREATE POLICY "Students can view published assignments"
  ON assignments
  FOR SELECT
  TO authenticated
  USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM student_enrollments
      WHERE student_enrollments.course_id = assignments.course_id
      AND student_enrollments.student_id = auth.uid()
      AND student_enrollments.status = 'enrolled'
    )
  );

-- Function to get enrolled courses for a student
CREATE OR REPLACE FUNCTION get_enrolled_courses(p_student_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  professor_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  start_date timestamptz,
  end_date timestamptz,
  max_students integer,
  professor_name text,
  student_count bigint,
  enrollment_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    c.professor_id,
    c.created_at,
    c.updated_at,
    c.start_date,
    c.end_date,
    c.max_students,
    p.name AS professor_name,
    COALESCE(ec.count, 0)::bigint AS student_count,
    se.status::text AS enrollment_status
  FROM courses c
  JOIN student_enrollments se ON se.course_id = c.id AND se.student_id = p_student_id
  LEFT JOIN user_profiles p ON c.professor_id = p.id
  LEFT JOIN (
    SELECT 
      course_id,
      COUNT(*) AS count
    FROM student_enrollments
    WHERE status = 'enrolled'
    GROUP BY course_id
  ) ec ON ec.course_id = c.id
  WHERE se.status = 'enrolled'
  ORDER BY c.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_enrolled_courses(uuid) TO authenticated;