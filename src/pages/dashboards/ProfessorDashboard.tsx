import React from 'react';
import { Users, BookOpen, Brain, Bell } from 'lucide-react';
import NotificationList from '../../components/notifications/NotificationList';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ProfessorDashboard() {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [stats, setStats] = React.useState({
    totalStudents: 0,
    totalCourses: 0,
    platformUsage: 0
  });
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      fetchStats();
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

  const fetchStats = async () => {
    try {
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('professor_id', user?.id);

      if (coursesError) throw coursesError;

      const { count: studentsCount } = await supabase
        .from('course_enrollments')
        .select('id', { count: 'exact' })
        .in('course_id', courses?.map(c => c.id) || []);

      setStats({
        totalStudents: studentsCount || 0,
        totalCourses: courses?.length || 0,
        platformUsage: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Welcome Back, Professor</h1>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Students</h3>
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
            <p className="text-sm text-gray-500">Total Enrolled</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Courses</h3>
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.totalCourses}</p>
            <p className="text-sm text-gray-500">Active Courses</p>
          </div>
          
          <div className="col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl shadow-sm text-white">
            <div className="flex items-center space-x-2 mb-4">
              <Brain className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Platform Usage</h3>
            </div>
            <p>Create your first course to get AI-powered insights and recommendations.</p>
          </div>
        </div>

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