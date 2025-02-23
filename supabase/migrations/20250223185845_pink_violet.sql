-- Drop existing view
DROP VIEW IF EXISTS student_points_summary;

-- Create improved view for student points summary with default values
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
UNION ALL
SELECT 
  auth.uid() as student_id,
  NULL as course_id,
  0 as total_points,
  jsonb_build_object(
    'assignment', 0,
    'quiz', 0,
    'participation', 0,
    'community', 0,
    'bonus', 0
  ) as points_by_category,
  now() as last_updated
WHERE NOT EXISTS (
  SELECT 1 FROM student_points WHERE student_id = auth.uid()
);

-- Grant access to the view
GRANT SELECT ON student_points_summary TO authenticated;