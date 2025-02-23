/*
  # Add Points and Achievements System

  1. New Tables
    - `student_points`
      - Tracks points earned by students
      - Records point history and categories
    - `achievements`
      - Defines available achievements
      - Includes requirements and rewards
    - `student_achievements`
      - Tracks earned achievements
      - Records unlock dates and progress

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control

  3. Functions
    - Add points tracking
    - Achievement progress calculation
    - Reward distribution
*/

-- Create achievement types enum
CREATE TYPE achievement_type AS ENUM (
  'assignment_completion',
  'quiz_mastery',
  'participation',
  'community_engagement',
  'learning_streak'
);

-- Create point categories enum
CREATE TYPE point_category AS ENUM (
  'assignment',
  'quiz',
  'participation',
  'community',
  'bonus'
);

-- Create student points table
CREATE TABLE IF NOT EXISTS student_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  category point_category NOT NULL,
  points integer NOT NULL CHECK (points > 0),
  description text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  type achievement_type NOT NULL,
  icon_url text NOT NULL,
  points_reward integer NOT NULL CHECK (points_reward >= 0),
  requirements jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create student achievements table
CREATE TABLE IF NOT EXISTS student_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  progress jsonb DEFAULT '{"current": 0, "required": 100}'::jsonb,
  unlocked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, achievement_id)
);

-- Enable RLS
ALTER TABLE student_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;

-- Create policies for student_points
CREATE POLICY "Students can view their own points"
  ON student_points
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Professors can view points for their courses"
  ON student_points
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = student_points.course_id
      AND courses.professor_id = auth.uid()
    )
  );

-- Create policies for achievements
CREATE POLICY "Everyone can view achievements"
  ON achievements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage achievements"
  ON achievements
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create policies for student_achievements
CREATE POLICY "Students can view their own achievements"
  ON student_achievements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Professors can view achievements for their students"
  ON student_achievements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN student_enrollments se ON se.course_id = c.id
      WHERE c.professor_id = auth.uid()
      AND se.student_id = student_achievements.student_id
    )
  );

-- Function to award points
CREATE OR REPLACE FUNCTION award_points(
  p_student_id uuid,
  p_course_id uuid,
  p_category point_category,
  p_points integer,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_points integer;
BEGIN
  -- Insert points
  INSERT INTO student_points (
    student_id,
    course_id,
    category,
    points,
    description,
    metadata
  ) VALUES (
    p_student_id,
    p_course_id,
    p_category,
    p_points,
    p_description,
    p_metadata
  );

  -- Get total points
  SELECT COALESCE(SUM(points), 0)
  INTO v_total_points
  FROM student_points
  WHERE student_id = p_student_id;

  -- Check for new achievements
  PERFORM check_achievements(p_student_id);

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', p_points,
    'total_points', v_total_points
  );
END;
$$;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement record;
  v_progress jsonb;
  v_current integer;
  v_required integer;
BEGIN
  -- Loop through all achievements
  FOR v_achievement IN
    SELECT * FROM achievements
    WHERE id NOT IN (
      SELECT achievement_id 
      FROM student_achievements 
      WHERE student_id = p_student_id 
      AND unlocked_at IS NOT NULL
    )
  LOOP
    -- Calculate progress based on achievement type
    CASE v_achievement.type
      WHEN 'assignment_completion' THEN
        SELECT COUNT(*)::integer INTO v_current
        FROM assignment_submissions
        WHERE student_id = p_student_id
        AND score >= 70;
        
      WHEN 'quiz_mastery' THEN
        SELECT COUNT(*)::integer INTO v_current
        FROM assignment_submissions
        WHERE student_id = p_student_id
        AND score >= 90;
        
      WHEN 'participation' THEN
        SELECT COALESCE(SUM(points), 0)::integer INTO v_current
        FROM student_points
        WHERE student_id = p_student_id
        AND category = 'participation';
        
      ELSE
        v_current := 0;
    END CASE;

    -- Get required value
    v_required := (v_achievement.requirements->>'required')::integer;

    -- Update or insert progress
    INSERT INTO student_achievements (
      student_id,
      achievement_id,
      progress,
      unlocked_at
    ) VALUES (
      p_student_id,
      v_achievement.id,
      jsonb_build_object(
        'current', v_current,
        'required', v_required
      ),
      CASE WHEN v_current >= v_required THEN now() ELSE NULL END
    )
    ON CONFLICT (student_id, achievement_id) DO UPDATE
    SET 
      progress = jsonb_build_object(
        'current', v_current,
        'required', v_required
      ),
      unlocked_at = CASE WHEN v_current >= v_required AND student_achievements.unlocked_at IS NULL
                    THEN now()
                    ELSE student_achievements.unlocked_at
                    END;

    -- Award points if achievement was just unlocked
    IF v_current >= v_required THEN
      PERFORM award_points(
        p_student_id,
        NULL,
        'bonus',
        v_achievement.points_reward,
        'Achievement unlocked: ' || v_achievement.name,
        jsonb_build_object('achievement_id', v_achievement.id)
      );
    END IF;
  END LOOP;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_points_student_id 
  ON student_points(student_id);
CREATE INDEX IF NOT EXISTS idx_student_points_course_id 
  ON student_points(course_id);
CREATE INDEX IF NOT EXISTS idx_student_points_category 
  ON student_points(category);
CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id 
  ON student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_achievement_id 
  ON student_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type 
  ON achievements(type);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION award_points(uuid, uuid, point_category, integer, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements(uuid) TO authenticated;