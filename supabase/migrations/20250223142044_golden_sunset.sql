-- Drop existing function and trigger to recreate them
DROP FUNCTION IF EXISTS enforce_enrollment_rules() CASCADE;
DROP FUNCTION IF EXISTS check_enrollment_eligibility(uuid, uuid) CASCADE;

--- Function to check enrollment eligibility with qualified column names
CREATE OR REPLACE FUNCTION check_enrollment_eligibility(
  p_course_id uuid,
  p_student_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_max_students integer;
  v_existing integer;
BEGIN
  -- Check for existing enrollment
  SELECT COUNT(*) INTO v_existing
  FROM public.course_enrollments ce
  WHERE ce.course_id = p_course_id
  AND ce.student_id = p_student_id;

  IF v_existing > 0 THEN
    RETURN false;
  END IF;

  -- Get course capacity
  SELECT c.max_students INTO v_max_students
  FROM public.courses c
  WHERE c.id = p_course_id;

  -- Get current enrollment count
  SELECT COUNT(*) INTO v_count
  FROM public.course_enrollments ce
  WHERE ce.course_id = p_course_id
  AND ce.status IN ('enrolled', 'pending');

  RETURN v_count < v_max_students;
END;
$$;

-- Trigger function to enforce enrollment rules with qualified column names
CREATE OR REPLACE FUNCTION enforce_enrollment_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check eligibility
  IF NOT check_enrollment_eligibility(NEW.course_id, NEW.student_id) THEN
    RAISE EXCEPTION 'Enrollment not allowed: course is full or student already enrolled'
      USING HINT = 'Please check course capacity and existing enrollments';
  END IF;

  RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER enforce_enrollment_rules_trigger
  BEFORE INSERT ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_enrollment_rules();

-- Update get_course_details function to use qualified column names
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
    p.name as professor_name,
    COALESCE(e.count, 0)::bigint as student_count,
    ce.status as enrollment_status
  FROM courses c
  LEFT JOIN user_profiles p ON c.professor_id = p.id
  LEFT JOIN (
    SELECT ce.course_id, COUNT(*) as count
    FROM course_enrollments ce
    WHERE ce.status IN ('enrolled', 'pending')
    GROUP BY ce.course_id
  ) e ON e.course_id = c.id
  LEFT JOIN course_enrollments ce ON 
    ce.course_id = c.id AND 
    ce.student_id = p_student_id;
END;
$$;