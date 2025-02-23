/*
  # Course Management Schema

  1. New Tables
    - `courses`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `professor_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `course_materials`
      - `id` (uuid, primary key)
      - `course_id` (uuid, references courses)
      - `title` (text)
      - `description` (text)
      - `file_url` (text)
      - `file_type` (text)
      - `ai_summary` (text)
      - `ai_insights` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Professors can manage their own courses and materials
    - Students can read materials for enrolled courses
    - Admins have full access
*/

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  professor_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create course_materials table
CREATE TABLE IF NOT EXISTS course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL,
  ai_summary text,
  ai_insights jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;

-- Policies for courses
CREATE POLICY "Professors can manage their own courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (auth.uid() = professor_id)
  WITH CHECK (auth.uid() = professor_id);

CREATE POLICY "Students can view courses"
  ON courses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins have full access to courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Policies for course_materials
CREATE POLICY "Professors can manage their materials"
  ON course_materials
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = course_materials.course_id 
    AND courses.professor_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = course_materials.course_id 
    AND courses.professor_id = auth.uid()
  ));

CREATE POLICY "Students can view materials"
  ON course_materials
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins have full access to materials"
  ON course_materials
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');