-- Create function to award points for assignment completion
CREATE OR REPLACE FUNCTION award_assignment_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
  v_assignment_title text;
  v_course_id uuid;
BEGIN
  -- Get assignment details
  SELECT 
    title,
    course_id 
  INTO v_assignment_title, v_course_id
  FROM assignments
  WHERE id = NEW.assignment_id;

  -- Calculate points based on score
  v_points := CASE
    WHEN NEW.score >= 90 THEN 100
    WHEN NEW.score >= 80 THEN 80
    WHEN NEW.score >= 70 THEN 60
    WHEN NEW.score >= 60 THEN 40
    ELSE 20
  END;

  -- Award points
  PERFORM award_points(
    NEW.student_id,
    v_course_id,
    'assignment',
    v_points,
    'Completed assignment: ' || v_assignment_title || ' with score ' || NEW.score || '%',
    jsonb_build_object(
      'assignment_id', NEW.assignment_id,
      'score', NEW.score,
      'submission_id', NEW.id
    )
  );

  -- Check for achievements
  PERFORM check_achievements(NEW.student_id);

  RETURN NEW;
END;
$$;

-- Create trigger for awarding points on assignment submission
DROP TRIGGER IF EXISTS award_assignment_points_trigger ON assignment_submissions;
CREATE TRIGGER award_assignment_points_trigger
  AFTER INSERT ON assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION award_assignment_points();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION award_assignment_points() TO authenticated;