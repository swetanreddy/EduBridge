-- Drop existing function to recreate it with fixed JSONB handling
DROP FUNCTION IF EXISTS analyze_assignment_submission(uuid);

-- Create improved analyze_assignment_submission function
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
  v_correct_count integer := 0;
  v_total_questions integer;
  v_topics_mastered text[] := '{}';
  v_topics_to_review text[] := '{}';
  v_analysis jsonb;
BEGIN
  -- Get submission details with assignment
  SELECT 
    s.*,
    a.content,
    a.title,
    a.type
  INTO v_submission
  FROM assignment_submissions s
  JOIN assignments a ON a.id = s.assignment_id
  WHERE s.id = p_submission_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Submission not found'
    );
  END IF;

  -- Get total questions
  v_total_questions := jsonb_array_length(v_submission.content->'questions');

  -- Analyze each question
  FOR i IN 0..v_total_questions-1 LOOP
    DECLARE
      v_question jsonb := (v_submission.content->'questions')->i;
      v_student_answer jsonb := v_submission.answers->i;
      v_correct_answer integer;
      v_student_choice integer;
      v_question_text text;
    BEGIN
      -- Extract values safely
      v_correct_answer := (v_question->>'correctAnswer')::integer;
      v_student_choice := (v_student_answer->>'answer')::integer;
      v_question_text := v_question->>'question';

      -- Compare answers
      IF v_correct_answer = v_student_choice THEN
        v_correct_count := v_correct_count + 1;
        v_topics_mastered := array_append(v_topics_mastered, v_question_text);
      ELSE
        v_topics_to_review := array_append(v_topics_to_review, v_question_text);
      END IF;
    END;
  END LOOP;

  -- Build analysis object
  v_analysis := jsonb_build_object(
    'score', v_submission.score,
    'total_questions', v_total_questions,
    'correct_count', v_correct_count,
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
      WHEN v_submission.score >= 80 THEN jsonb_build_array(
        'Review specific topics that need improvement',
        'Practice with more complex problems',
        'Consider group study sessions'
      )
      WHEN v_submission.score >= 70 THEN jsonb_build_array(
        'Focus on understanding core concepts',
        'Schedule regular review sessions',
        'Consider seeking help from professor'
      )
      ELSE jsonb_build_array(
        'Schedule a review session with professor',
        'Focus on fundamentals',
        'Consider study groups or tutoring',
        'Review course materials thoroughly'
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