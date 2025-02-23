import React from 'react';
import { BookOpen, Users, Clock, ChevronRight, Pencil, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Course {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  max_students: number;
  created_at: string;
  student_count?: number;
}

interface CourseListProps {
  onCourseSelect: (courseId: string) => void;
}

export default function CourseList({ onCourseSelect }: CourseListProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*, student_count:course_enrollments(count)')
        .eq('professor_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data?.map(course => ({
        ...course,
        student_count: course.student_count?.[0]?.count || 0
      })) || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const handleUpdate = async (course: Course) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          title: course.title,
          description: course.description,
          start_date: course.start_date,
          end_date: course.end_date,
          max_students: course.max_students,
        })
        .eq('id', course.id);

      if (error) throw error;
      setEditingCourse(null);
      fetchCourses();
    } catch (error) {
      console.error('Error updating course:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <div
          key={course.id}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 relative"
        >
          <div className="p-6 pr-16">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                  {editingCourse?.id === course.id ? (
                    <input
                      type="text"
                      value={editingCourse.title}
                      onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                      className="text-lg font-semibold text-gray-900 border-b border-gray-300 focus:border-indigo-500 focus:outline-none"
                    />
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900">
                      {course.title}
                    </h3>
                  )}
                </div>
                {editingCourse?.id === course.id ? (
                  <textarea
                    value={editingCourse.description}
                    onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                    className="mt-2 w-full text-gray-600 border rounded-lg p-2 focus:border-indigo-500 focus:outline-none"
                    rows={2}
                  />
                ) : (
                  <p className="mt-2 text-gray-600">{course.description}</p>
                )}
                
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {course.student_count || 0} Students
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(course.start_date).toLocaleDateString()} - {new Date(course.end_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Updated {new Date(course.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                {editingCourse?.id === course.id && (
                  <div className="mt-4 flex gap-4">
                    <button
                      onClick={() => handleUpdate(editingCourse)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingCourse(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              <div className="absolute top-6 right-6 flex items-center space-x-2">
                <button
                  onClick={() => setEditingCourse(course)}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(course.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onCourseSelect(course.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {courses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Courses Yet</h3>
          <p className="text-gray-500">Create your first course to get started</p>
        </div>
      )}
    </div>
  );
}