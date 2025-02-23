/*
  # Add content column to course materials
  
  1. Changes
    - Add content column to store text content of materials
    - Add content_type column to distinguish between file and text content
    - Add index on content_type for better query performance
*/

-- Add content column to course_materials
ALTER TABLE course_materials
ADD COLUMN IF NOT EXISTS content text,
ADD COLUMN IF NOT EXISTS content_type text CHECK (content_type IN ('file', 'text')) NOT NULL DEFAULT 'file';

-- Add index for content_type
CREATE INDEX IF NOT EXISTS idx_course_materials_content_type ON course_materials(content_type);

-- Update RLS policies to reflect new columns
DROP POLICY IF EXISTS "Professors can manage their materials" ON course_materials;
DROP POLICY IF EXISTS "Students can view materials" ON course_materials;

CREATE POLICY "Professors can manage their materials"
  ON course_materials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.professor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.professor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view materials"
  ON course_materials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = course_materials.course_id
      AND course_enrollments.student_id = auth.uid()
      AND course_enrollments.status = 'enrolled'
    )
  );