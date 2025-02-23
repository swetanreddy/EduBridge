import React, { useState, useEffect } from 'react';
import { Plus, Users, Calendar, BookOpen, Bell, MessageSquare } from 'lucide-react';
import CourseUpload from '../../components/course/CourseUpload';
import MaterialList from '../../components/course/MaterialList';
import CreateAssignmentModal from '../../components/course/CreateAssignmentModal';
import AssignmentList from '../../components/course/AssignmentList';
import NotificationList from '../../components/notifications/NotificationList';
import CreateAnnouncementModal from '../../components/course/CreateAnnouncementModal';
import AnnouncementList from '../../components/course/AnnouncementList';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Course {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  max_students: number;
  student_count: number;
}

interface CoursePageProps {
  courseId: string;
  onNavigate: (page: string) => void;
}

export default function CoursePage({ courseId, onNavigate }: CoursePageProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCourse();
      fetchUnreadNotifications();
    }
  }, [user, courseId]);

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

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          student_count:course_enrollments(count)
        `)
        .eq('id', courseId)
        .single();

      if (error) throw error;

      setCourse({
        ...data,
        student_count: data.student_count?.[0]?.count || 0
      });
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
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

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Course not found</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/courses');
                onNavigate('courses');
              }}
              className="text-gray-600 hover:text-gray-900 mb-2"
            >
              ← Back to Courses
            </button>
            <h1 className="text-3xl font-bold">{course.title}</h1>
          </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Course Details</h2>
              <p className="text-gray-600 mb-6">{course.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">
                    {course.student_count} / {course.max_students} Students
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">
                    {new Date(course.start_date).toLocaleDateString()} - {new Date(course.end_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Announcements</h2>
                {user?.id === course.professor_id && (
                  <button
                    onClick={() => setShowCreateAnnouncement(true)}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg
                      hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Announcement
                  </button>
                )}
              </div>
              <AnnouncementList courseId={courseId} />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Course Materials</h2>
                <button
                  onClick={() => setShowUpload(!showUpload)}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg
                    hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Upload Materials
                </button>
              </div>

              {showUpload && (
                <div className="mb-6">
                  <CourseUpload
                    courseId={courseId}
                    onUploadComplete={() => setShowUpload(false)}
                  />
                </div>
              )}

              <MaterialList courseId={courseId} />
            </div>
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Assignments</h2>
                <button
                  onClick={() => setShowCreateAssignment(true)}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg
                    hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Assignment
                </button>
              </div>
              <AssignmentList courseId={courseId} />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">Students</h2>
              {/* Student list will go here */}
              <div className="text-gray-500 text-center py-4">
                No students enrolled yet
              </div>
            </div>
          </div>
        </div>

        {showCreateAssignment && (
          <CreateAssignmentModal
            courseId={courseId}
            onClose={() => setShowCreateAssignment(false)}
            onSuccess={() => {
              fetchCourse();
              setShowCreateAssignment(false);
            }}
          />
        )}

        {showCreateAnnouncement && (
          <CreateAnnouncementModal
            courseId={courseId}
            onClose={() => setShowCreateAnnouncement(false)}
            onSuccess={() => {
              fetchCourse();
              setShowCreateAnnouncement(false);
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