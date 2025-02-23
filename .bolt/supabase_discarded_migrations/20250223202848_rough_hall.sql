-- Create or replace the student points summary view with proper RLS
CREATE OR REPLACE VIEW student_points_summary AS
WITH point_categories AS (
  SELECT unnest(enum_range(NULL::point_category)) as category
),
base_summary AS (
  SELECT 
    student_id,
    course_id,
    SUM(points) as total_points,
    jsonb_object_agg(category, COALESCE(category_points, 0)) as points_by_category,
    MAX(earned_at) as last_updated
  FROM (
    SELECT 
      sp.student_id,
      sp.course_id,
      sp.category,
      SUM(sp.points) as category_points,
      sp.points,
      sp.earned_at
    FROM student_points sp
    GROUP BY sp.student_id, sp.course_id, sp.category, sp.points, sp.earned_at
  ) sub
  GROUP BY student_id, course_id
)
SELECT 
  COALESCE(bs.student_id, auth.uid()) as student_id,
  bs.course_id,
  COALESCE(bs.total_points, 0) as total_points,
  COALESCE(bs.points_by_category, jsonb_build_object(
    'assignment', 0,
    'quiz', 0,
    'participation', 0,
    'community', 0,
    'bonus', 0
  )) as points_by_category,
  COALESCE(bs.last_updated, now()) as last_updated
FROM base_summary bs
WHERE bs.student_id = auth.uid()
OR EXISTS (
  SELECT 1 FROM courses c
  WHERE c.id = bs.course_id
  AND c.professor_id = auth.uid()
);

-- Create function to get student points
CREATE OR REPLACE FUNCTION get_student_points(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points jsonb;
BEGIN
  -- Verify permissions
  IF auth.uid() != p_student_id AND NOT EXISTS (
    SELECT 1 FROM courses c
    WHERE c.professor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM course_enrollments ce
      WHERE ce.course_id = c.id
      AND ce.student_id = p_student_id
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Not authorized to view these points'
    );
  END IF;

  -- Get points summary
  SELECT jsonb_build_object(
    'total_points', COALESCE(SUM(points), 0),
    'points_by_category', (
      SELECT jsonb_object_agg(
        category,
        COALESCE(SUM(points) FILTER (WHERE category = sp.category), 0)
      )
      FROM unnest(enum_range(NULL::point_category)) category
    ),
    'recent_points', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'points', points,
          'category', category,
          'description', description,
          'earned_at', earned_at
        )
        ORDER BY earned_at DESC
        LIMIT 5
      )
    )
  ) INTO v_points
  FROM student_points sp
  WHERE student_id = p_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(v_points, jsonb_build_object(
      'total_points', 0,
      'points_by_category', jsonb_build_object(
        'assignment', 0,
        'quiz', 0,
        'participation', 0,
        'community', 0,
        'bonus', 0
      ),
      'recent_points', '[]'::jsonb
    ))
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_student_points(uuid) TO authenticated;
GRANT SELECT ON student_points_summary TO authenticated;

-- Update RLS policies for student_points
DROP POLICY IF EXISTS "Students can view their own points" ON student_points;
DROP POLICY IF EXISTS "Professors can view points for their courses" ON student_points;

CREATE POLICY "view_student_points"
  ON student_points
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.professor_id = auth.uid()
      AND c.id = student_points.course_id
    )
  );