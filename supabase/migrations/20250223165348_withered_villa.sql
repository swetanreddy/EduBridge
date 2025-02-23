/*
  # Add assignment submissions

  1. New Tables
    - `assignment_submissions`
      - Stores student submissions for assignments
      - Tracks answers, score, and submission time
      - Links to assignments and students

  2. Security
    - Students can only submit to published assignments
    - Students can only view their own submissions
    - Professors can view all submissions for their courses
*/

-- Create assignment submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answers jsonb NOT NULL,
  score numeric(5,2) CHECK (score >= 0 AND score <= 100),
  feedback text,
  submitted_at timestamptz DEFAULT now(),
  graded_at timestamptz,
  UNIQUE(assignment_id, student_id)
);

-- Enable RLS
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for assignment submissions
CREATE POLICY "Students can submit to published assignments"
  ON assignment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON c.id = a.course_id
      JOIN student_enrollments se ON se.course_id = c.id
      WHERE a.id = assignment_id
      AND se.student_id = auth.uid()
      AND se.status = 'enrolled'
      AND a.published = true
    )
  );

CREATE POLICY "Students can view their own submissions"
  ON assignment_submissions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id
  );

CREATE POLICY "Professors can view submissions for their assignments"
  ON assignment_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = assignment_id
      AND c.professor_id = auth.uid()
    )
  );

-- Function to submit and grade assignment
CREATE OR REPLACE FUNCTION submit_assignment(
  p_assignment_id uuid,
  p_student_id uuid,
  p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment assignments%ROWTYPE;
  v_score numeric(5,2);
  v_correct_count integer := 0;
  v_total_questions integer;
  v_submission_id uuid;
BEGIN
  -- Get assignment details
  SELECT * INTO v_assignment
  FROM assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Assignment not found'
    );
  END IF;

  -- Verify assignment is published
  IF NOT v_assignment.published THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Assignment is not published'
    );
  END IF;

  -- Calculate score
  SELECT 
    COUNT(*) FILTER (
      WHERE (q->>'correctAnswer')::integer = 
            (a->>'answer')::integer
    ),
    COUNT(*)
  INTO v_correct_count, v_total_questions
  FROM jsonb_array_elements(v_assignment.content->'questions') WITH ORDINALITY AS q(question, idx)
  LEFT JOIN jsonb_array_elements(p_answers) WITH ORDINALITY AS a(answer, idx)
    ON q.idx = a.idx;

  -- Calculate percentage score
  v_score := (v_correct_count::numeric / v_total_questions::numeric) * 100;

  -- Insert submission
  INSERT INTO assignment_submissions (
    assignment_id,
    student_id,
    answers,
    score,
    graded_at
  ) VALUES (
    p_assignment_id,
    p_student_id,
    p_answers,
    v_score,
    now()
  )
  RETURNING id INTO v_submission_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Assignment submitted successfully',
    'score', v_score,
    'correct_count', v_correct_count,
    'total_questions', v_total_questions,
    'submission_id', v_submission_id
  );
END;
$$;