/*
  # Update Assignment Grading Logic

  1. Changes
    - Update submit_assignment function to use correct answers from content
    - Add validation for answer format
    - Improve error handling and scoring calculation

  2. Security
    - Maintain existing security checks
    - Ensure proper access control
*/

-- Drop existing function to recreate it
DROP FUNCTION IF EXISTS submit_assignment(uuid, uuid, jsonb);

-- Create improved submit_assignment function with content-based answers
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
  v_question jsonb;
  v_student_answer integer;
  v_correct_answer integer;
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

  -- Get total questions
  v_total_questions := jsonb_array_length(v_assignment.content->'questions');

  -- Validate answer format and count
  IF jsonb_typeof(p_answers) != 'array' OR
     jsonb_array_length(p_answers) != v_total_questions THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid answer format or incorrect number of answers'
    );
  END IF;

  -- Loop through each question and compare answers
  FOR i IN 0..v_total_questions-1 LOOP
    BEGIN
      -- Get question and correct answer
      v_question := (v_assignment.content->'questions')->i;
      v_correct_answer := (v_question->>'correctAnswer')::integer;
      
      -- Get student's answer, defaulting to -1 if invalid
      v_student_answer := COALESCE((p_answers->i->>'answer')::integer, -1);
      
      -- Compare answers
      IF v_student_answer = v_correct_answer THEN
        v_correct_count := v_correct_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error and continue with next question
      RAISE NOTICE 'Error processing question %: %', i, SQLERRM;
      CONTINUE;
    END;
  END LOOP;

  -- Calculate percentage score with proper decimal handling
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION submit_assignment(uuid, uuid, jsonb) TO authenticated;