import React from 'react';
import { FileText, Brain, X, CheckCircle2, XCircle } from 'lucide-react';

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

interface AssignmentDetailsProps {
  assignment: Assignment;
  onClose: () => void;
}

export default function AssignmentDetails({ assignment, onClose }: AssignmentDetailsProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className={`w-6 h-6 ${assignment.published ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <h2 className="text-xl font-semibold">{assignment.title}</h2>
              <p className="text-sm text-gray-500">
                {assignment.points} points • Due {new Date(assignment.due_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-2">Description</h3>
            <p className="text-gray-600">{assignment.description}</p>
          </div>

          <div className="space-y-8">
            {assignment.content?.questions?.map((question, index) => (
              <div key={index} className="border-t pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium mb-4">Question {index + 1}</h4>
                    <p className="text-gray-800 mb-4">{question.question}</p>

                    <div className="space-y-3">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`flex items-center p-3 rounded-lg border ${
                            optionIndex === question.correctAnswer
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200'
                          }`}
                        >
                          {optionIndex === question.correctAnswer ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                          )}
                          <span className={optionIndex === question.correctAnswer ? 'text-green-900' : 'text-gray-700'}>
                            {option}
                          </span>
                        </div>
                      ))}
                    </div>

                    {question.explanation && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Brain className="w-5 h-5 text-blue-600 mr-2" />
                          <span className="font-medium text-blue-900">Explanation</span>
                        </div>
                        <p className="text-blue-800">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}