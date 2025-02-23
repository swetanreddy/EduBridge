import React, { useState, useEffect } from 'react';
import { PlusCircle, Bell, Users, Calendar, BookOpen, Pencil, Trash2 } from 'lucide-react';
import CreateCourseModal from '../../components/course/CreateCourseModal';
import EditCourseModal from '../../components/course/EditCourseModal';
import NotificationList from '../../components/notifications/NotificationList';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface ProfessorCoursesProps {
  onNavigate: (page: string) => void;
}

interface Course {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  max_students: number;
  student_count: number;
}

export default function ProfessorCourses({ onNavigate }: ProfessorCoursesProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCourses();
      fetchUnreadNotifications();
    }
  }, [user]);

  const fetchUnreadNotifications = async () => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('read', false);

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          student_count:course_enrollments(count)
        `)
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

  const handleCourseCreated = () => {
    setShowCreateCourse(false);
    fetchCourses();
  };

  const handleDelete = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;

    setDeleting(courseId);
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
      setCourses(courses.filter(c => c.id !== courseId));
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleCourseClick = (courseId: string) => {
    window.history.pushState({}, '', `/course/${courseId}`);
    onNavigate('course');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Courses</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCreateCourse(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg
                hover:bg-indigo-700 transition-colors shadow-sm hover:shadow"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Create Course
            </button>
            <button 
              onClick={() => setShowNotifications(true)}
              className="p-2 relative hover:bg-gray-100 rounded-full"
            >
              <Bell className="w-6 h-6 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
              onClick={() => handleCourseClick(course.id)}
            >
              <div className="p-6 relative">
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCourse(course);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(course.id, e)}
                    disabled={deleting === course.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {deleting === course.id ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <div
                  className="flex items-center space-x-3 mb-4 cursor-pointer"
                  onClick={() => {
                    window.history.pushState({}, '', `/course/${course.id}`);
                    onNavigate('course');
                  }}
                >
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    {course.title}
                  </h3>
                </div>
                
                <p className="text-gray-600 mb-6 line-clamp-2">
                  {course.description}
                </p>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {course.student_count} / {course.max_students} Students
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(course.start_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {courses.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-sm">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Courses Yet</h3>
              <p className="text-gray-500">Create your first course to get started</p>
            </div>
          )}
        </div>

        {showCreateCourse && (
          <CreateCourseModal
            onClose={() => setShowCreateCourse(false)}
            onSuccess={handleCourseCreated}
          />
        )}

        {editingCourse && (
          <EditCourseModal
            course={editingCourse}
            onClose={() => setEditingCourse(null)}
            onSuccess={() => {
              setEditingCourse(null);
              fetchCourses();
            }}
          />
        )}

        {showNotifications && (
          <NotificationList
            onClose={() => {
              setShowNotifications(false);
              fetchUnreadNotifications();
            }}
          />
        )}
      </div>
    </div>
  );
}