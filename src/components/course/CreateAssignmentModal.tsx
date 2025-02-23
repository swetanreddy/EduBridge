import React, { useState } from 'react';
import { X, Brain } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AIAssignmentCreator from './AIAssignmentCreator';

interface CreateAssignmentModalProps {
  courseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateAssignmentModal({ courseId, onClose, onSuccess }: CreateAssignmentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAICreator, setShowAICreator] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  React.useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('course_materials')
        .select('*')
        .eq('course_id', courseId);

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    points: '',
    type: 'assignment', // assignment, quiz, project
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from('assignments').insert({
        course_id: courseId,
        title: formData.title,
        description: formData.description,
        due_date: formData.dueDate,
        points: parseInt(formData.points),
        type: formData.type,
      });

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating assignment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (showAICreator) {
    return (
      <AIAssignmentCreator
        courseId={courseId}
        selectedMaterials={selectedMaterials}
        onClose={() => setShowAICreator(false)}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Create New Assignment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowAICreator(true)}
              disabled={selectedMaterials.length === 0}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r
                from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600
                hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Brain className="w-5 h-5 mr-2" />
              Create with AI
            </button>
            {selectedMaterials.length === 0 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Select course materials to use AI creation
              </p>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Course Materials</h3>
            <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
              {materials.map((material) => (
                <label
                  key={material.id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMaterials.includes(material.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMaterials([...selectedMaterials, material.id]);
                      } else {
                        setSelectedMaterials(selectedMaterials.filter(id => id !== material.id));
                      }
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-3">{material.title}</span>
                </label>
              ))}
              {materials.length === 0 && (
                <div className="p-3 text-gray-500 text-center">
                  No materials uploaded yet
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Or create manually
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Midterm Project"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Assignment details and requirements"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="single_choice">Single Choice</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., 100"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}