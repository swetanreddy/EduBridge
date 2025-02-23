-- Function to award points for assignment completion
CREATE OR REPLACE FUNCTION award_assignment_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
  v_assignment_title text;
BEGIN
  -- Get assignment details
  SELECT title INTO v_assignment_title
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
    (SELECT course_id FROM assignments WHERE id = NEW.assignment_id),
    'assignment',
    v_points,
    'Completed assignment: ' || v_assignment_title || ' with score ' || NEW.score || '%',
    jsonb_build_object(
      'assignment_id', NEW.assignment_id,
      'score', NEW.score,
      'submission_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for awarding points on assignment submission
DROP TRIGGER IF EXISTS award_assignment_points_trigger ON assignment_submissions;
CREATE TRIGGER award_assignment_points_trigger
  AFTER INSERT ON assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION award_assignment_points();

-- Create view for student points summary
CREATE OR REPLACE VIEW student_points_summary AS
SELECT 
  student_id,
  course_id,
  SUM(points) as total_points,
  jsonb_object_agg(category, category_points) as points_by_category,
  MAX(earned_at) as last_updated
FROM (
  SELECT 
    student_id,
    course_id,
    category,
    SUM(points) as category_points,
    points,
    earned_at
  FROM student_points
  GROUP BY student_id, course_id, category, points, earned_at
) sub
GROUP BY student_id, course_id;

-- Grant access to the view
GRANT SELECT ON student_points_summary TO authenticated;