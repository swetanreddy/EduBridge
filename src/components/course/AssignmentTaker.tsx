import React, { useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { analyzeSubmission } from '../../lib/openai';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: string;
  points: number;
  due_date: string;
  published: boolean;
  content: {
    questions: Question[];
  };
}

interface AssignmentTakerProps {
  assignment: Assignment;
  onClose: () => void;
  onSubmit: () => void;
}

export default function AssignmentTaker({ assignment, onClose, onSubmit }: AssignmentTakerProps) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnswer = (questionIndex: number, answerIndex: number) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  };

  const handleSubmit = async () => {
    if (answers.length !== assignment.content.questions.length) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_assignment', {
        p_assignment_id: assignment.id,
        p_student_id: user?.id,
        p_answers: answers.map(answer => ({ answer }))
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to submit assignment');
      }

      // Get submission ID from response
      const submissionId = data.submission_id;
      
      // Get AI-powered analysis
      const analysis = await analyzeSubmission(submissionId);

      setScore(data?.score || 0);
      setAnalysis(analysis);
      setSubmitted(true);
      onSubmit();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert(
        error instanceof Error 
          ? error.message 
          : 'Failed to submit assignment. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{assignment.title}</h2>
              <p className="text-sm text-gray-500">
                {assignment.points} points • Due {new Date(assignment.due_date).toLocaleDateString()}
              </p>
            </div>
            {!submitted && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Assignment Submitted!</h3>
              <div className="max-w-lg mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h4 className="text-xl font-semibold mb-4">Results</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Score:</span>
                      <span className="text-2xl font-bold text-indigo-600">
                        {score?.toFixed(1)}%
                      </span>
                    </div>
                    {analysis && (
                      <>
                        <div className="border-t pt-4">
                          <h5 className="font-medium mb-2">Performance Summary</h5>
                          <p className="text-gray-600">{analysis.performance_summary}</p>
                        </div>
                        <div className="border-t pt-4">
                          <h5 className="font-medium mb-2">Topics Mastered</h5>
                          <div className="space-y-1">
                            {analysis.topics_mastered?.map((topic: string, i: number) => (
                              <div key={i} className="flex items-center text-green-600">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                <span>{topic}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {analysis.topics_to_review.length > 0 && (
                          <div className="border-t pt-4">
                            <h5 className="font-medium mb-2">Topics to Review</h5>
                            <div className="space-y-1">
                              {analysis.topics_to_review.map((topic: string, i: number) => (
                                <div key={i} className="flex items-center text-red-600">
                                  <XCircle className="w-4 h-4 mr-2" />
                                  <span>{topic}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="border-t pt-4">
                          <h5 className="font-medium mb-2">Detailed Analysis</h5>
                          <div className="space-y-4">
                            <div>
                              <h6 className="text-sm font-medium text-gray-700">Strengths</h6>
                              <ul className="mt-1 list-disc list-inside text-sm text-gray-600">
                                {analysis.detailed_analysis?.strengths?.map((strength: string, i: number) => (
                                  <li key={i}>{strength}</li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h6 className="text-sm font-medium text-gray-700">Areas to Improve</h6>
                              <ul className="mt-1 list-disc list-inside text-sm text-gray-600">
                                {analysis.detailed_analysis?.weaknesses?.map((weakness: string, i: number) => (
                                  <li key={i}>{weakness}</li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h6 className="text-sm font-medium text-gray-700">Learning Patterns</h6>
                              <ul className="mt-1 list-disc list-inside text-sm text-gray-600">
                                {analysis.detailed_analysis?.patterns?.map((pattern: string, i: number) => (
                                  <li key={i}>{pattern}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t pt-4">
                          <h5 className="font-medium mb-2">Study Strategies</h5>
                          <ul className="list-disc list-inside space-y-1 text-gray-600">
                            {analysis.study_strategies?.map((strategy: string, i: number) => (
                              <li key={i}>{strategy}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="border-t pt-4">
                          <h5 className="font-medium mb-2">Recommended Resources</h5>
                          <ul className="list-disc list-inside space-y-1 text-gray-600">
                            {analysis.resources?.map((resource: string, i: number) => (
                              <li key={i}>{resource}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="border-t pt-4">
                          <h5 className="font-medium mb-2">Recommendations</h5>
                          <ul className="list-disc list-inside space-y-1 text-gray-600">
                            {analysis.recommendations?.map((recommendation: string, i: number) => (
                              <li key={i}>{recommendation}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-8">{assignment.description}</p>

              <div className="space-y-8">
                {assignment.content.questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="border-t pt-6">
                    <h4 className="font-medium mb-4">Question {questionIndex + 1}</h4>
                    <p className="text-gray-800 mb-4">{question.question}</p>

                    <div className="space-y-3">
                      {question.options.map((option, optionIndex) => (
                        <button
                          key={optionIndex}
                          onClick={() => handleAnswer(questionIndex, optionIndex)}
                          className={`w-full flex items-center p-3 rounded-lg border transition-colors ${
                            answers[questionIndex] === optionIndex
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50'
                          }`}
                        >
                          <div className="w-5 h-5 border-2 rounded-full mr-3 flex-shrink-0
                            flex items-center justify-center
                            transition-colors
                            ${answers[questionIndex] === optionIndex
                              ? 'border-indigo-500 bg-indigo-500'
                              : 'border-gray-300'}"
                          >
                            {answers[questionIndex] === optionIndex && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <span>{option}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || answers.length !== assignment.content.questions.length}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                    disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Assignment'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}