/*
  # Add Course Completion Badges and Certificates

  1. New Tables
    - `badges`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `image_url` (text)
      - `created_at` (timestamptz)
    
    - `student_badges`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references auth.users)
      - `badge_id` (uuid, references badges)
      - `course_id` (uuid, references courses)
      - `earned_at` (timestamptz)
      - `certificate_url` (text)

  2. Security
    - Enable RLS on both tables
    - Add policies for viewing and managing badges
*/

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create student_badges table
CREATE TABLE IF NOT EXISTS student_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id uuid REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),
  certificate_url text,
  UNIQUE(student_id, course_id)
);

-- Enable RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;

-- Policies for badges
CREATE POLICY "Badges are viewable by all authenticated users"
  ON badges
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage badges"
  ON badges
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Policies for student_badges
CREATE POLICY "Students can view their own badges"
  ON student_badges
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id OR
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = student_badges.course_id
      AND courses.professor_id = auth.uid()
    )
  );

-- Function to award badge and generate certificate
CREATE OR REPLACE FUNCTION award_course_completion(
  p_course_id uuid,
  p_student_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_title text;
  v_badge_id uuid;
  v_certificate_url text;
BEGIN
  -- Get course title
  SELECT title INTO v_course_title
  FROM courses
  WHERE id = p_course_id;

  -- Create or get badge
  INSERT INTO badges (
    name,
    description,
    image_url
  ) VALUES (
    v_course_title || ' Completion Badge',
    'Awarded for completing ' || v_course_title,
    'https://api.dicebear.com/7.x/shapes/svg?seed=' || p_course_id -- Generate unique badge image
  )
  ON CONFLICT (id) DO UPDATE
  SET updated_at = now()
  RETURNING id INTO v_badge_id;

  -- Generate certificate URL (using DiceBear for demo)
  v_certificate_url := 'https://api.dicebear.com/7.x/shapes/svg?seed=certificate-' || p_course_id || '-' || p_student_id;

  -- Award badge and certificate
  INSERT INTO student_badges (
    student_id,
    badge_id,
    course_id,
    certificate_url
  ) VALUES (
    p_student_id,
    v_badge_id,
    p_course_id,
    v_certificate_url
  )
  ON CONFLICT (student_id, course_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Badge and certificate awarded successfully',
    'badge_id', v_badge_id,
    'certificate_url', v_certificate_url
  );
END;
$$;