import React, { useState } from 'react';
import { Brain, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateAssignment, AssignmentType } from '../../lib/openai';

interface AIAssignmentCreatorProps {
  courseId: string;
  selectedMaterials: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface AssignmentType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const assignmentTypes: AssignmentType[] = [
  {
    id: 'multiple_choice',
    name: 'Multiple Choice',
    description: 'Quiz with multiple correct answers possible',
    icon: <FileText className="w-6 h-6 text-blue-600" />
  },
  {
    id: 'single_choice',
    name: 'Single Choice',
    description: 'Quiz with only one correct answer per question',
    icon: <FileText className="w-6 h-6 text-indigo-600" />
  }
];

export default function AIAssignmentCreator({ courseId, selectedMaterials, onClose, onSuccess }: AIAssignmentCreatorProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [generatedAssignment, setGeneratedAssignment] = useState<any>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      // Get material content
      const materialPromises = selectedMaterials.map(async (materialId) => {
        const { data: material } = await supabase
          .from('course_materials')
          .select('title, content, content_type, file_url, ai_summary')
          .eq('id', materialId)
          .single();

        if (!material) throw new Error(`Material ${materialId} not found`);

        // If content is a file URL, we need to fetch the content
        if (material.content_type === 'file' && material.file_url) {
          const { data: fileData, error: fileError } = await supabase.storage
            .from('course-materials')
            .download(material.file_url);

          if (fileError) throw fileError;
          
          // Convert file content to text
          material.content = await fileData.text();
        }

        return material;
      });

      const materials = await Promise.all(materialPromises);

      const assignment = await generateAssignment({
        type: selectedType as AssignmentType,
        materials: materials.map(m => ({
          title: m.title,
          content: m.content_type === 'file' ? m.content || '' : m.content || '',
          summary: m.ai_summary
        })),
        customInstructions: customPrompt
      });

      setGeneratedAssignment(assignment);
    } catch (error) {
      console.error('Error generating assignment:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate assignment. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedAssignment) return;

    try {
      const { error } = await supabase.from('assignments').insert({
        course_id: courseId,
        title: generatedAssignment.title,
        description: generatedAssignment.description,
        type: selectedType,
        points: generatedAssignment.points,
        due_date: generatedAssignment.dueDate,
        ai_generated: true,
        content: generatedAssignment
      });

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error saving assignment:', error);
      alert(error instanceof Error ? error.message : 'Failed to save assignment. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold">AI Assignment Creator</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {!generatedAssignment ? (
            <>
              <div>
                <h3 className="text-lg font-medium mb-4">Select Assignment Type</h3>
                <div className="space-y-4">
                  {assignmentTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all duration-300
                        ${selectedType === type.id ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-2' : 'border-gray-200 hover:border-indigo-600'}`}
                    >
                      <div className="flex items-center space-x-3">
                        {type.icon}
                        <div>
                          <h4 className="font-medium">{type.name}</h4>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Custom Instructions (Optional)</h3>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Add any specific instructions or requirements for the AI..."
                  className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Generated Assignment</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">{generatedAssignment.title}</h4>
                  <p className="text-gray-600 mt-2">{generatedAssignment.description}</p>
                  
                  {selectedType === 'multiple_choice' && (
                    <div className="mt-4 space-y-4">
                      {generatedAssignment.questions.map((q: any, i: number) => (
                        <div key={i} className="border-t pt-4">
                          <p className="font-medium">Question {i + 1}</p>
                          <p className="mt-1">{q.question}</p>
                          <div className="mt-2 space-y-2">
                            {q.options.map((option: string, j: number) => (
                              <div key={j} className="flex items-center">
                                <input
                                  type="radio"
                                  name={`q${i}`}
                                  disabled
                                  checked={j === q.correctAnswer}
                                  className="h-4 w-4 text-indigo-600"
                                />
                                <span className="ml-2">{option}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          {!generatedAssignment ? (
            <button
              onClick={handleGenerate}
              disabled={!selectedType || generating}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5 mr-2" />
                  Generate Assignment
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                flex items-center"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Save Assignment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}