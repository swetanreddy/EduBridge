import React, { useState, useEffect } from 'react';
import { FileText, Trash2, Eye, EyeOff, Loader2, PenSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AssignmentDetails from './AssignmentDetails';
import AssignmentTaker from './AssignmentTaker';
import { useAuth } from '../../contexts/AuthContext';

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: string;
  points: number;
  due_date: string;
  published: boolean;
  content: any;
}

interface AssignmentListProps {
  courseId: string;
}

export default function AssignmentList({ courseId }: AssignmentListProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [takingAssignment, setTakingAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const { user } = useAuth();
  const isProfessor = user?.user_metadata?.role === 'professor';

  useEffect(() => {
    fetchAssignments();
  }, [courseId]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    setDeleting(assignmentId);
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      setAssignments(assignments.filter(a => a.id !== assignmentId));
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const togglePublish = async (assignmentId: string, currentStatus: boolean) => {
    setPublishing(assignmentId);
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ published: !currentStatus })
        .eq('id', assignmentId);

      if (error) throw error;
      setAssignments(assignments.map(a => 
        a.id === assignmentId ? { ...a, published: !currentStatus } : a
      ));
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('Failed to update assignment status. Please try again.');
    } finally {
      setPublishing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">
        No assignments yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
        >
          <div 
            className="flex items-start justify-between cursor-pointer"
            onClick={() => {
              if (isProfessor) {
                setSelectedAssignment(assignment);
              } else if (assignment.published) {
                setTakingAssignment(assignment);
              }
            }}
          >
            <div className="flex items-start space-x-3">
              <FileText className={`w-5 h-5 mt-1 ${
                assignment.published ? 'text-green-600' : 'text-gray-400'
              }`} />
              <div>
                <h3 className="font-medium">{assignment.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>{assignment.type === 'multiple_choice' ? 'Multiple Choice' : 'Single Choice'}</span>
                  <span>{assignment.points} points</span>
                  <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isProfessor ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePublish(assignment.id, assignment.published);
                    }}
                    disabled={publishing === assignment.id}
                    className={`p-1 rounded-full transition-colors ${
                      assignment.published 
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    title={assignment.published ? 'Unpublish' : 'Publish'}
                  >
                    {publishing === assignment.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : assignment.published ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(assignment.id);
                    }}
                    disabled={deleting === assignment.id}
                    className="p-1 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete"
                  >
                    {deleting === assignment.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </>
              ) : assignment.published && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTakingAssignment(assignment);
                  }}
                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                  title="Take Assignment"
                >
                  <PenSquare className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {selectedAssignment && (
        <AssignmentDetails
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
      
      {takingAssignment && (
        <AssignmentTaker
          assignment={takingAssignment}
          onClose={() => setTakingAssignment(null)}
          onSubmit={() => {
            fetchAssignments();
          }}
        />
      )}
    </div>
  );
}