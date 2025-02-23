-- Add analysis fields to assignments table
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS learning_objectives text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS topic_mapping jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));

-- Create function to analyze student performance by topic
CREATE OR REPLACE FUNCTION analyze_student_performance(
  p_student_id uuid,
  p_course_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_performance jsonb;
  v_total_questions integer := 0;
  v_correct_by_topic jsonb := '{}'::jsonb;
  v_total_by_topic jsonb := '{}'::jsonb;
  v_submission record;
  v_assignment record;
  v_question jsonb;
  v_answer jsonb;
  v_topic text;
BEGIN
  -- Loop through all submissions for this student in this course
  FOR v_submission IN
    SELECT s.*, a.content, a.topic_mapping
    FROM assignment_submissions s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.student_id = p_student_id
    AND a.course_id = p_course_id
  LOOP
    -- Analyze each question
    FOR i IN 0..jsonb_array_length(v_submission.content->'questions')-1 LOOP
      v_question := (v_submission.content->'questions')->i;
      v_answer := v_submission.answers->i;
      v_topic := v_submission.topic_mapping->>v_question->>'question';
      
      IF v_topic IS NOT NULL THEN
        -- Update total questions for this topic
        v_total_by_topic := jsonb_set(
          v_total_by_topic,
          array[v_topic],
          to_jsonb(COALESCE((v_total_by_topic->>v_topic)::integer, 0) + 1)
        );
        
        -- Update correct answers if answer matches
        IF (v_question->>'correctAnswer')::integer = (v_answer->>'answer')::integer THEN
          v_correct_by_topic := jsonb_set(
            v_correct_by_topic,
            array[v_topic],
            to_jsonb(COALESCE((v_correct_by_topic->>v_topic)::integer, 0) + 1)
          );
        END IF;
      END IF;
      
      v_total_questions := v_total_questions + 1;
    END LOOP;
  END LOOP;

  -- Calculate performance metrics
  SELECT jsonb_build_object(
    'total_questions', v_total_questions,
    'topics', (
      SELECT jsonb_object_agg(
        topic,
        jsonb_build_object(
          'total_questions', (v_total_by_topic->>topic)::integer,
          'correct_answers', COALESCE((v_correct_by_topic->>topic)::integer, 0),
          'accuracy', ROUND(
            (COALESCE((v_correct_by_topic->>topic)::numeric, 0) / 
            NULLIF((v_total_by_topic->>topic)::numeric, 0)) * 100,
            2
          )
        )
      )
      FROM jsonb_object_keys(v_total_by_topic) topic
    ),
    'recommendations', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'topic', topic,
          'status', CASE
            WHEN (COALESCE((v_correct_by_topic->>topic)::numeric, 0) / 
                  NULLIF((v_total_by_topic->>topic)::numeric, 0)) >= 0.8 
            THEN 'Mastered'
            WHEN (COALESCE((v_correct_by_topic->>topic)::numeric, 0) / 
                  NULLIF((v_total_by_topic->>topic)::numeric, 0)) >= 0.6 
            THEN 'Progressing'
            ELSE 'Needs Review'
          END,
          'accuracy', ROUND(
            (COALESCE((v_correct_by_topic->>topic)::numeric, 0) / 
            NULLIF((v_total_by_topic->>topic)::numeric, 0)) * 100,
            2
          )
        )
      )
      FROM jsonb_object_keys(v_total_by_topic) topic
      WHERE (v_total_by_topic->>topic)::integer > 0
    ),
    'analyzed_at', now()
  ) INTO v_performance;

  RETURN v_performance;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION analyze_student_performance(uuid, uuid) TO authenticated;

-- Create policy for topic analysis
CREATE POLICY "Professors can view topic analysis"
  ON assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = assignments.course_id
      AND courses.professor_id = auth.uid()
    )
  );