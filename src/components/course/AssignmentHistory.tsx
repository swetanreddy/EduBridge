import React, { useState, useEffect } from 'react';
import { FileText, Clock, Brain, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { analyzeSubmission } from '../../lib/openai';

interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  answers: { answer: number }[];
  score: number;
  submitted_at: string;
  assignment: {
    title: string;
    description: string;
    content: {
      questions: {
        question: string;
        options: string[];
        correctAnswer: number;
      }[];
    };
  };
}

interface AssignmentHistoryProps {
  courseId: string;
}

export default function AssignmentHistory({ courseId }: AssignmentHistoryProps) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    fetchSubmissions();
  }, [courseId]);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*, assignment:assignments(*)')
        .eq('student_id', user?.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      
      // Get analyses for all submissions
      const analysisPromises = data?.map(async (submission) => {
        try {
          const analysis = await analyzeSubmission(submission.id);
          return [submission.id, analysis];
        } catch (err) {
          console.error('Error analyzing submission:', err);
          return [submission.id, null];
        }
      }) || [];

      const analysisResults = await Promise.all(analysisPromises);
      const analysisMap = Object.fromEntries(
        analysisResults.filter(([_, analysis]) => analysis)
      );

      setSubmissions(data || []);
      setAnalyses(analysisMap);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-xl shadow-sm">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions Yet</h3>
        <p className="text-gray-500">Complete assignments to see your history</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <FileText className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-lg font-semibold">{submission.assignment.title}</h3>
                </div>
                
                <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                  </div>
                  <div className="font-medium text-indigo-600">
                    Score: {submission.score.toFixed(1)}%
                  </div>
                </div>

                {expandedSubmission === submission.id && analyses[submission.id] && (
                  <div className="mt-6 space-y-6">
                    <div className="space-y-4">
                      {submission.assignment.content.questions.map((question, index) => (
                        <div key={index} className="border-t pt-4">
                          <p className="font-medium mb-2">Question {index + 1}</p>
                          <p className="text-gray-800 mb-3">{question.question}</p>

                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div
                                key={optionIndex}
                                className={`p-3 rounded-lg border ${
                                  optionIndex === question.correctAnswer
                                    ? 'border-green-200 bg-green-50'
                                    : optionIndex === submission.answers[index]?.answer
                                    ? 'border-red-200 bg-red-50'
                                    : 'border-gray-200'
                                }`}
                              >
                                <div className="flex items-center">
                                  {optionIndex === question.correctAnswer ? (
                                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mr-3">
                                      <div className="w-3 h-3 rounded-full bg-green-500" />
                                    </div>
                                  ) : optionIndex === submission.answers[index]?.answer ? (
                                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mr-3">
                                      <div className="w-3 h-3 rounded-full bg-red-500" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-3" />
                                  )}
                                  <span className={
                                    optionIndex === question.correctAnswer
                                      ? 'text-green-900'
                                      : optionIndex === submission.answers[index]?.answer
                                      ? 'text-red-900'
                                      : 'text-gray-700'
                                  }>{option}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 bg-gray-50 rounded-lg p-6">
                      <h4 className="flex items-center text-lg font-medium mb-4">
                        <Brain className="w-5 h-5 text-indigo-600 mr-2" />
                        Performance Analysis
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <h5 className="font-medium mb-2">Summary</h5>
                          <p className="text-gray-600">
                            {analyses[submission.id].performance_summary}
                          </p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium mb-2">Topics Mastered</h5>
                            <div className="space-y-1">
                              {analyses[submission.id].topics_mastered.map((topic: string, i: number) => (
                                <div key={i} className="flex items-center text-green-600">
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  <span className="text-sm">{topic}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {analyses[submission.id].topics_to_review.length > 0 && (
                            <div>
                              <h5 className="font-medium mb-2">Topics to Review</h5>
                              <div className="space-y-1">
                                {analyses[submission.id].topics_to_review.map((topic: string, i: number) => (
                                  <div key={i} className="flex items-center text-red-600">
                                    <XCircle className="w-4 h-4 mr-2" />
                                    <span className="text-sm">{topic}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h5 className="font-medium mb-2">Recommendations</h5>
                          <ul className="list-disc list-inside space-y-1">
                            {analyses[submission.id].recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-gray-600 text-sm">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setExpandedSubmission(
                  expandedSubmission === submission.id ? null : submission.id
                )}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                {expandedSubmission === submission.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}