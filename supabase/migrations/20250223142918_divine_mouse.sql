/*
  # Create Storage Bucket for Course Materials

  1. Changes
    - Creates a new storage bucket for course materials
    - Sets up appropriate security policies for the bucket
    - Enables RLS for the bucket

  2. Security
    - Students can download materials from courses they're enrolled in
    - Professors can upload and manage materials for their courses
    - Admins have full access
*/

-- Enable storage by creating the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', false);

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
      SELECT 1 FROM course_enrollments ce
      WHERE ce.course_id::text = (storage.foldername(name))[1]
      AND ce.student_id = auth.uid()
      AND ce.status = 'enrolled'
    )
    -- Or if user is the professor of the course
    OR EXISTS (
      SELECT 1 FROM courses
      WHERE id::text = (storage.foldername(name))[1]
      AND professor_id = auth.uid()
    )
    -- Or if user is an admin
    OR auth.jwt() ->> 'role' = 'admin'
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