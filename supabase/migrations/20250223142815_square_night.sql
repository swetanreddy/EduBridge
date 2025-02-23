/*
  # Fix Course Details Function

  1. Changes
    - Fixes the created_at column reference in get_course_details function
    - Ensures proper column qualification
    - Improves query performance with better join structure

  2. Functions Updated
    - get_course_details: Now properly references course created_at
*/

-- Drop and recreate the get_course_details function with fixed column references
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
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH enrollment_counts AS (
    SELECT 
      ce.course_id,
      COUNT(*) AS count
    FROM public.course_enrollments ce
    WHERE ce.status IN ('enrolled', 'pending')
    GROUP BY ce.course_id
  ),
  student_enrollment AS (
    SELECT 
      ce.course_id,
      ce.status
    FROM public.course_enrollments ce
    WHERE ce.student_id = p_student_id
  )
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
    se.status AS enrollment_status
  FROM public.courses c
  LEFT JOIN public.user_profiles p ON c.professor_id = p.id
  LEFT JOIN enrollment_counts ec ON ec.course_id = c.id
  LEFT JOIN student_enrollment se ON se.course_id = c.id
  ORDER BY c.created_at DESC;
END;
$$;