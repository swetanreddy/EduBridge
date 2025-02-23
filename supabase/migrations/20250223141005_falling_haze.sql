/*
  # Fix course details view and permissions

  1. Changes
    - Create course details view with proper permissions
    - Add function for course details with proper security context
    - Add necessary indexes for performance

  2. Security
    - Set proper ownership and grants
    - Use security definer for consistent access
*/

-- Create course details view with proper security context
CREATE OR REPLACE VIEW public.course_details AS
SELECT 
  c.*,
  up.name as professor_name,
  COALESCE(e.enrollment_count, 0) as student_count
FROM public.courses c
LEFT JOIN public.user_profiles up ON c.professor_id = up.id
LEFT JOIN (
  SELECT course_id, COUNT(*) as enrollment_count
  FROM public.course_enrollments
  WHERE status IN ('enrolled', 'pending')
  GROUP BY course_id
) e ON c.id = e.course_id;

-- Set ownership and grant access
ALTER VIEW public.course_details OWNER TO postgres;
GRANT SELECT ON public.course_details TO authenticated;

-- Create function to get course details with enrollment status
CREATE OR REPLACE FUNCTION public.get_course_details(student_id uuid)
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
  SELECT 
    cd.*,
    ce.status as enrollment_status
  FROM public.course_details cd
  LEFT JOIN public.course_enrollments ce ON 
    cd.id = ce.course_id AND 
    ce.student_id = $1;
END;
$$;

-- Set function ownership and permissions
ALTER FUNCTION public.get_course_details(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_course_details(uuid) TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_courses_professor_id ON public.courses(professor_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_student ON public.course_enrollments(course_id, student_id);