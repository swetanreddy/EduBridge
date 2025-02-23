-- Create course_chats table
CREATE TABLE IF NOT EXISTS course_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now(),
  material_references jsonb DEFAULT '[]',
  CONSTRAINT valid_material_references CHECK (jsonb_typeof(material_references) = 'array')
);

-- Enable RLS
ALTER TABLE course_chats ENABLE ROW LEVEL SECURITY;

-- Create policies for course_chats
CREATE POLICY "Students can view their own chats"
  ON course_chats
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM student_enrollments
      WHERE student_enrollments.course_id = course_chats.course_id
      AND student_enrollments.student_id = auth.uid()
      AND student_enrollments.status = 'enrolled'
    )
  );

CREATE POLICY "Students can create chats for enrolled courses"
  ON course_chats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM student_enrollments
      WHERE student_enrollments.course_id = course_chats.course_id
      AND student_enrollments.student_id = auth.uid()
      AND student_enrollments.status = 'enrolled'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_chats_course_student 
  ON course_chats(course_id, student_id);
CREATE INDEX IF NOT EXISTS idx_course_chats_created_at 
  ON course_chats(created_at DESC);