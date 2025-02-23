-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS handle_enrollment_response(uuid, boolean) CASCADE;

-- Function to handle enrollment responses with proper type casting
CREATE OR REPLACE FUNCTION handle_enrollment_response(
  p_enrollment_id uuid,
  p_approved boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_course_id uuid;
  v_course_title text;
  v_professor_id uuid;
  v_new_status enrollment_status;
BEGIN
  -- Get enrollment details
  SELECT 
    se.student_id,
    se.course_id,
    c.title,
    c.professor_id
  INTO 
    v_student_id,
    v_course_id,
    v_course_title,
    v_professor_id
  FROM student_enrollments se
  JOIN courses c ON c.id = se.course_id
  WHERE se.id = p_enrollment_id;

  -- Verify professor is making the request
  IF auth.uid() != v_professor_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized to respond to this enrollment request'
    );
  END IF;

  -- Set the new status using proper type casting
  v_new_status := CASE WHEN p_approved THEN 'enrolled'::enrollment_status ELSE 'rejected'::enrollment_status END;

  -- Update enrollment status
  UPDATE student_enrollments
  SET status = v_new_status
  WHERE id = p_enrollment_id;

  -- Create notification for student
  INSERT INTO notifications (
    recipient_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_student_id,
    'enrollment_response',
    CASE WHEN p_approved 
      THEN 'Enrollment Approved'
      ELSE 'Enrollment Rejected'
    END,
    CASE WHEN p_approved 
      THEN 'Your enrollment in ' || v_course_title || ' has been approved'
      ELSE 'Your enrollment in ' || v_course_title || ' has been rejected'
    END,
    jsonb_build_object(
      'course_id', v_course_id,
      'course_title', v_course_title,
      'approved', p_approved
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN p_approved 
      THEN 'Enrollment approved successfully'
      ELSE 'Enrollment rejected successfully'
    END
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_enrollment_response(uuid, boolean) TO authenticated;