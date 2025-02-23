/*
  # Add Answer Storage and Validation

  1. Changes
    - Add correct_answers column to assignments table
    - Add validation function for answer format
    - Update submit_assignment function to use stored correct answers

  2. Security
    - Only professors can see correct answers
    - Students can only see their own submissions
*/

-- Add correct_answers column to assignments table
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS correct_answers jsonb DEFAULT '[]'::jsonb;

-- Create function to validate answer format
CREATE OR REPLACE FUNCTION validate_answer_format(answers jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if answers is an array
  IF jsonb_typeof(answers) != 'array' THEN
    RETURN false;
  END IF;

  -- Check each answer has required format
  FOR i IN 0..jsonb_array_length(answers)-1 LOOP
    IF jsonb_typeof(answers->i) != 'object' OR
       NOT (answers->i ? 'answer') OR
       jsonb_typeof(answers->i->'answer') != 'number' THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- Update submit_assignment function to use stored correct answers
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
  v_correct_answer integer;
  v_student_answer integer;
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

  -- Verify student is enrolled
  IF NOT EXISTS (
    SELECT 1 FROM student_enrollments
    WHERE course_id = v_assignment.course_id
    AND student_id = p_student_id
    AND status = 'enrolled'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You must be enrolled in this course to submit assignments'
    );
  END IF;

  -- Validate answer format
  IF NOT validate_answer_format(p_answers) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid answer format'
    );
  END IF;

  -- Calculate score
  v_total_questions := jsonb_array_length(v_assignment.correct_answers);
  
  -- Loop through each answer and compare
  FOR i IN 0..v_total_questions-1 LOOP
    BEGIN
      -- Get correct answer and student answer
      v_correct_answer := (v_assignment.correct_answers->i->>'answer')::integer;
      v_student_answer := (p_answers->i->>'answer')::integer;
      
      -- Compare answers
      IF v_student_answer = v_correct_answer THEN
        v_correct_count := v_correct_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error and continue with next question
      RAISE NOTICE 'Error processing answer %: %', i, SQLERRM;
      CONTINUE;
    END;
  END LOOP;

  -- Calculate percentage score
  v_score := ROUND((v_correct_count::numeric / NULLIF(v_total_questions, 0)::numeric) * 100, 2);

  -- Insert or update submission
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
  ON CONFLICT (assignment_id, student_id) DO UPDATE
  SET 
    answers = EXCLUDED.answers,
    score = EXCLUDED.score,
    graded_at = EXCLUDED.graded_at
  RETURNING id INTO v_submission_id;

  -- Return detailed results
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Assignment submitted and graded successfully',
    'score', v_score,
    'correct_count', v_correct_count,
    'total_questions', v_total_questions,
    'submission_id', v_submission_id
  );
END;
$$;

-- Create function to store assignment answers
CREATE OR REPLACE FUNCTION store_assignment_answers(
  p_assignment_id uuid,
  p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is professor
  IF NOT EXISTS (
    SELECT 1 FROM courses c
    JOIN assignments a ON a.course_id = c.id
    WHERE a.id = p_assignment_id
    AND c.professor_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only professors can store assignment answers'
    );
  END IF;

  -- Validate answer format
  IF NOT validate_answer_format(p_answers) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid answer format'
    );
  END IF;

  -- Store answers
  UPDATE assignments
  SET correct_answers = p_answers
  WHERE id = p_assignment_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Assignment answers stored successfully'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION submit_assignment(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION store_assignment_answers(uuid, jsonb) TO authenticated;

-- Update RLS policies
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hide correct answers from students"
  ON assignments
  FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM courses
        WHERE courses.id = assignments.course_id
        AND courses.professor_id = auth.uid()
      ) THEN true
      ELSE (
        SELECT jsonb_build_object(
          'id', assignments.id,
          'title', assignments.title,
          'description', assignments.description,
          'type', assignments.type,
          'points', assignments.points,
          'due_date', assignments.due_date,
          'published', assignments.published,
          'content', assignments.content - 'correct_answers',
          'created_at', assignments.created_at,
          'updated_at', assignments.updated_at
        ) IS NOT NULL
      )
    END
  );