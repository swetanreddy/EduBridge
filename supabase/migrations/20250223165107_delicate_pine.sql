/*
  # Fix storage bucket configuration

  1. Changes
    - Create course-materials bucket if it doesn't exist
    - Set bucket to private (not public)
    - Add proper RLS policies for file access
    
  2. Security
    - Only professors can upload files to their courses
    - Students can only access files from courses they're enrolled in
    - Professors can access files from their courses
*/

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Professors can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can download course materials" ON storage.objects;
DROP POLICY IF EXISTS "Professors can delete their course materials" ON storage.objects;
DROP POLICY IF EXISTS "Professors can update their course materials" ON storage.objects;

-- Create policies for the bucket
CREATE POLICY "Professors can upload course materials"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-materials'
  AND EXISTS (
    SELECT 1 FROM courses
    WHERE id::text = (storage.foldername(name))[1]
    AND professor_id = auth.uid()
  )
);

CREATE POLICY "Users can download course materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    -- Allow if user is enrolled in the course
    EXISTS (
      SELECT 1 FROM student_enrollments se
      WHERE se.course_id::text = (storage.foldername(name))[1]
      AND se.student_id = auth.uid()
      AND se.status = 'enrolled'
    )
    -- Or if user is the professor of the course
    OR EXISTS (
      SELECT 1 FROM courses
      WHERE id::text = (storage.foldername(name))[1]
      AND professor_id = auth.uid()
    )
  )
);

CREATE POLICY "Professors can delete their course materials"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-materials'
  AND EXISTS (
    SELECT 1 FROM courses
    WHERE id::text = (storage.foldername(name))[1]
    AND professor_id = auth.uid()
  )
);

CREATE POLICY "Professors can update their course materials"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-materials'
  AND EXISTS (
    SELECT 1 FROM courses
    WHERE id::text = (storage.foldername(name))[1]
    AND professor_id = auth.uid()
  )
);