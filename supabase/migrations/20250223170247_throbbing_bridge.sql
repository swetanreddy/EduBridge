-- Add analysis column to assignment_submissions
ALTER TABLE assignment_submissions
ADD COLUMN IF NOT EXISTS analysis jsonb DEFAULT '{}'::jsonb;

-- Create function to analyze assignment submission
CREATE OR REPLACE FUNCTION analyze_assignment_submission(
  p_submission_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission record;
  v_assignment record;
  v_correct_answers text[] := '{}';
  v_incorrect_answers text[] := '{}';
  v_topics_mastered text[] := '{}';
  v_topics_to_review text[] := '{}';
  v_question jsonb;
  v_answer jsonb;
  v_analysis jsonb;
BEGIN
  -- Get submission details
  SELECT 
    s.id,
    s.assignment_id,
    s.student_id,
    s.answers,
    s.score,
    s.submitted_at
  INTO v_submission
  FROM assignment_submissions s
  WHERE s.id = p_submission_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Submission not found'
    );
  END IF;

  -- Get assignment details
  SELECT 
    a.id,
    a.title,
    a.content,
    a.type
  INTO v_assignment
  FROM assignments a
  WHERE a.id = v_submission.assignment_id;

  -- Analyze each question
  FOR i IN 0..jsonb_array_length(v_assignment.content->'questions')-1 LOOP
    v_question := (v_assignment.content->'questions')->i;
    v_answer := v_submission.answers->i;
    
    IF (v_question->>'correctAnswer')::integer = (v_answer->>'answer')::integer THEN
      v_correct_answers := array_append(v_correct_answers, v_question->>'question');
      v_topics_mastered := array_append(v_topics_mastered, v_question->>'question');
    ELSE
      v_incorrect_answers := array_append(v_incorrect_answers, v_question->>'question');
      v_topics_to_review := array_append(v_topics_to_review, v_question->>'question');
    END IF;
  END LOOP;

  -- Build analysis object
  v_analysis := jsonb_build_object(
    'score', v_submission.score,
    'total_questions', jsonb_array_length(v_assignment.content->'questions'),
    'correct_answers', v_correct_answers,
    'incorrect_answers', v_incorrect_answers,
    'topics_mastered', v_topics_mastered,
    'topics_to_review', v_topics_to_review,
    'performance_summary', CASE 
      WHEN v_submission.score >= 90 THEN 'Excellent understanding of the material'
      WHEN v_submission.score >= 80 THEN 'Good understanding with some areas for improvement'
      WHEN v_submission.score >= 70 THEN 'Satisfactory understanding but needs review'
      ELSE 'Needs significant review of the material'
    END,
    'recommendations', CASE 
      WHEN v_submission.score >= 90 THEN jsonb_build_array(
        'Continue with advanced topics',
        'Help peers understand challenging concepts',
        'Explore related materials for deeper understanding'
      )
      WHEN v_submission.score >= 70 THEN jsonb_build_array(
        'Review incorrect answers',
        'Focus on understanding core concepts',
        'Practice similar questions'
      )
      ELSE jsonb_build_array(
        'Schedule a review session',
        'Focus on fundamentals',
        'Revisit course materials',
        'Consider seeking additional help'
      )
    END,
    'analyzed_at', now()
  );

  -- Update submission with analysis
  UPDATE assignment_submissions
  SET analysis = v_analysis
  WHERE id = p_submission_id;

  RETURN jsonb_build_object(
    'success', true,
    'analysis', v_analysis
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION analyze_assignment_submission(uuid) TO authenticated;

-- Create policy for analysis updates
CREATE POLICY "Students can analyze their own submissions"
  ON assignment_submissions
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());