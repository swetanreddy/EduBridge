/*
  # Create course enrollments and assignments tables

  1. New Tables
    - `course_enrollments`
      - `id` (uuid, primary key)
      - `course_id` (uuid, references courses)
      - `student_id` (uuid, references auth.users)
      - `enrolled_at` (timestamptz)
      - `status` (text)
    
    - `assignments`
      - `id` (uuid, primary key)
      - `course_id` (uuid, references courses)
      - `title` (text)
      - `description` (text)
      - `due_date` (timestamptz)
      - `points` (integer)
      - `type` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for professors to manage assignments
    - Add policies for students to view assignments
    - Add policies for course enrollment management
*/

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrolled_at timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('enrolled', 'completed', 'dropped')) DEFAULT 'enrolled',
  UNIQUE(course_id, student_id)
);

-- Enable RLS for course_enrollments
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- Policies for course_enrollments
CREATE POLICY "Students can view their own enrollments"
  ON course_enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Professors can view enrollments for their courses"
  ON course_enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_enrollments.course_id
      AND courses.professor_id = auth.uid()
    )
  );

CREATE POLICY "Students can enroll themselves in courses"
  ON course_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id AND
    status = 'enrolled' AND
    NOT EXISTS (
      SELECT 1 FROM course_enrollments e
      WHERE e.course_id = course_id
      AND e.student_id = auth.uid()
    )
  );

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamptz NOT NULL,
  points integer NOT NULL CHECK (points >= 0),
  type text NOT NULL CHECK (type IN ('assignment', 'quiz', 'project')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for assignments
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for assignments
CREATE TRIGGER set_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Policies for assignments
CREATE POLICY "Professors can manage assignments for their courses"
  ON assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = assignments.course_id 
      AND courses.professor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = assignments.course_id 
      AND courses.professor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view assignments for enrolled courses"
  ON assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = assignments.course_id
      AND course_enrollments.student_id = auth.uid()
      AND course_enrollments.status = 'enrolled'
    )
  );