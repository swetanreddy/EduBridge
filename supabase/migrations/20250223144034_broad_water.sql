/*
  # Add AI Assignment Support

  1. New Columns
    - Add ai_generated flag to assignments
    - Add content JSONB field for AI-generated content
    - Add material_ids array for referenced materials

  2. Security
    - Update RLS policies to handle new fields
*/

-- Add new columns to assignments table
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS content jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS material_ids uuid[] DEFAULT '{}';

-- Add index for material_ids to improve query performance
CREATE INDEX IF NOT EXISTS idx_assignments_material_ids ON assignments USING GIN (material_ids);

-- Update assignments RLS policies
DROP POLICY IF EXISTS "Professors can manage assignments for their courses" ON assignments;

CREATE POLICY "Professors can manage assignments"
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

-- Function to validate material access
CREATE OR REPLACE FUNCTION validate_assignment_materials()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all material_ids belong to the same course
  IF EXISTS (
    SELECT 1 FROM course_materials
    WHERE id = ANY(NEW.material_ids)
    AND course_id != NEW.course_id
  ) THEN
    RAISE EXCEPTION 'All materials must belong to the same course';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for material validation
CREATE TRIGGER validate_assignment_materials_trigger
  BEFORE INSERT OR UPDATE ON assignments
  FOR EACH ROW
  WHEN (NEW.material_ids IS NOT NULL AND array_length(NEW.material_ids, 1) > 0)
  EXECUTE FUNCTION validate_assignment_materials();