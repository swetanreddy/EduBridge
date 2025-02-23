-- Add new columns to assignment_submissions for enhanced analysis
ALTER TABLE assignment_submissions
ADD COLUMN IF NOT EXISTS topic_performance jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS time_spent integer, -- in seconds
ADD COLUMN IF NOT EXISTS difficulty_rating integer CHECK (difficulty_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS confidence_score integer CHECK (confidence_score BETWEEN 1 AND 5);

-- Create function for enhanced assignment analysis
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
  v_topic_stats jsonb := '{}';
  v_overall_confidence numeric;
  v_learning_style text;
BEGIN
  -- Get submission details with assignment
  SELECT 
    s.*,
    a.content,
    a.title,
    a.type,
    a.learning_objectives,
    a.topic_mapping
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

  -- Analyze each question and build topic statistics
  FOR i IN 0..jsonb_array_length(v_submission.content->'questions')-1 LOOP
    v_question := (v_submission.content->'questions')->i;
    v_answer := v_submission.answers->i;
    
    -- Get topic for this question
    DECLARE
      v_topic text := v_submission.topic_mapping->>v_question->>'question';
      v_is_correct boolean := (v_question->>'correctAnswer')::integer = (v_answer->>'answer')::integer;
    BEGIN
      -- Update topic statistics
      IF v_topic IS NOT NULL THEN
        v_topic_stats := jsonb_set(
          v_topic_stats,
          array[v_topic],
          coalesce(v_topic_stats->v_topic, '{
            "total": 0,
            "correct": 0,
            "incorrect": 0,
            "accuracy": 0
          }'::jsonb)
        );
        
        v_topic_stats := jsonb_set(
          v_topic_stats,
          array[v_topic, 'total'],
          to_jsonb((v_topic_stats->v_topic->>'total')::integer + 1)
        );

        IF v_is_correct THEN
          v_topic_stats := jsonb_set(
            v_topic_stats,
            array[v_topic, 'correct'],
            to_jsonb((v_topic_stats->v_topic->>'correct')::integer + 1)
          );
          v_topics_mastered := array_append(v_topics_mastered, v_topic);
        ELSE
          v_topic_stats := jsonb_set(
            v_topic_stats,
            array[v_topic, 'incorrect'],
            to_jsonb((v_topic_stats->v_topic->>'incorrect')::integer + 1)
          );
          v_topics_to_review := array_append(v_topics_to_review, v_topic);
        END IF;

        -- Calculate accuracy for this topic
        v_topic_stats := jsonb_set(
          v_topic_stats,
          array[v_topic, 'accuracy'],
          to_jsonb(
            ROUND(
              (v_topic_stats->v_topic->>'correct')::numeric /
              (v_topic_stats->v_topic->>'total')::numeric * 100,
              2
            )
          )
        );
      END IF;

      -- Store question result
      IF v_is_correct THEN
        v_correct_answers := array_append(v_correct_answers, v_question->>'question');
      ELSE
        v_incorrect_answers := array_append(v_incorrect_answers, v_question->>'question');
      END IF;
    END;
  END LOOP;

  -- Calculate overall confidence based on answer patterns
  SELECT 
    CASE
      WHEN v_submission.score >= 90 THEN 5
      WHEN v_submission.score >= 80 THEN 4
      WHEN v_submission.score >= 70 THEN 3
      WHEN v_submission.score >= 60 THEN 2
      ELSE 1
    END INTO v_overall_confidence;

  -- Determine learning style based on performance patterns
  SELECT 
    CASE
      WHEN array_length(v_topics_mastered, 1) > array_length(v_topics_to_review, 1) THEN
        'Strong conceptual understanding'
      WHEN v_submission.time_spent < 300 AND v_submission.score >= 80 THEN
        'Quick learner'
      WHEN v_submission.time_spent > 600 AND v_submission.score >= 80 THEN
        'Methodical learner'
      ELSE
        'Needs additional support'
    END INTO v_learning_style;

  -- Build comprehensive analysis
  v_analysis := jsonb_build_object(
    'score', v_submission.score,
    'total_questions', jsonb_array_length(v_submission.content->'questions'),
    'time_spent', v_submission.time_spent,
    'correct_answers', v_correct_answers,
    'incorrect_answers', v_incorrect_answers,
    'topics_mastered', v_topics_mastered,
    'topics_to_review', v_topics_to_review,
    'topic_performance', v_topic_stats,
    'confidence_level', v_overall_confidence,
    'learning_style', v_learning_style,
    'performance_summary', CASE 
      WHEN v_submission.score >= 90 THEN 'Excellent mastery of the material'
      WHEN v_submission.score >= 80 THEN 'Strong understanding with minor areas for improvement'
      WHEN v_submission.score >= 70 THEN 'Good grasp of basics but needs focused review'
      WHEN v_submission.score >= 60 THEN 'Basic understanding achieved but significant review needed'
      ELSE 'Fundamental concepts need reinforcement'
    END,
    'detailed_feedback', jsonb_build_object(
      'strengths', (
        SELECT jsonb_agg(topic)
        FROM (
          SELECT key as topic
          FROM jsonb_each_text(v_topic_stats)
          WHERE (v_topic_stats->key->>'accuracy')::numeric >= 80
        ) t
      ),
      'areas_for_improvement', (
        SELECT jsonb_agg(topic)
        FROM (
          SELECT key as topic
          FROM jsonb_each_text(v_topic_stats)
          WHERE (v_topic_stats->key->>'accuracy')::numeric < 70
        ) t
      )
    ),
    'recommendations', CASE 
      WHEN v_submission.score >= 90 THEN jsonb_build_array(
        'Challenge yourself with advanced topics',
        'Consider peer tutoring opportunities',
        'Explore related advanced materials'
      )
      WHEN v_submission.score >= 80 THEN jsonb_build_array(
        'Review specific topics that need improvement',
        'Practice with more complex problems',
        'Consider group study for knowledge sharing'
      )
      WHEN v_submission.score >= 70 THEN jsonb_build_array(
        'Focus on understanding core concepts',
        'Utilize additional learning resources',
        'Schedule regular review sessions',
        'Consider seeking clarification from professor'
      )
      ELSE jsonb_build_array(
        'Schedule a meeting with your professor',
        'Review fundamental concepts',
        'Consider study groups or tutoring',
        'Utilize office hours for additional help'
      )
    END,
    'next_steps', jsonb_build_object(
      'immediate_actions', (
        SELECT jsonb_agg(action)
        FROM (
          SELECT 'Review ' || topic as action
          FROM unnest(v_topics_to_review) topic
          LIMIT 3
        ) t
      ),
      'long_term_goals', CASE 
        WHEN v_submission.score >= 80 THEN jsonb_build_array(
          'Master advanced concepts',
          'Help peers with difficult topics',
          'Prepare for next level courses'
        )
        ELSE jsonb_build_array(
          'Build stronger foundation',
          'Practice regularly',
          'Seek additional resources'
        )
      END
    ),
    'analyzed_at', now()
  );

  -- Update submission with analysis
  UPDATE assignment_submissions
  SET 
    analysis = v_analysis,
    topic_performance = v_topic_stats
  WHERE id = p_submission_id;

  RETURN jsonb_build_object(
    'success', true,
    'analysis', v_analysis
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION analyze_assignment_submission(uuid) TO authenticated;