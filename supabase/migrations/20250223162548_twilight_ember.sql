-- Update get_course_details function to exclude enrolled courses
CREATE OR REPLACE FUNCTION get_course_details(p_student_id uuid)
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
  WITH enrollment_counts AS (
    SELECT 
      ce.course_id,
      COUNT(*) AS count
    FROM student_enrollments ce
    WHERE ce.status IN ('enrolled', 'pending')
    GROUP BY ce.course_id
  ),
  student_enrollment AS (
    SELECT 
      ce.course_id,
      ce.status::text
    FROM student_enrollments ce
    WHERE ce.student_id = p_student_id
  )
  SELECT DISTINCT ON (c.id)
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
    se.status AS enrollment_status
  FROM courses c
  LEFT JOIN user_profiles p ON c.professor_id = p.id
  LEFT JOIN enrollment_counts ec ON ec.course_id = c.id
  LEFT JOIN student_enrollment se ON se.course_id = c.id
  WHERE NOT EXISTS (
    SELECT 1 FROM student_enrollments e
    WHERE e.course_id = c.id
    AND e.student_id = p_student_id
    AND e.status = 'enrolled'
  )
  ORDER BY c.id, c.created_at DESC;
END;
$$;