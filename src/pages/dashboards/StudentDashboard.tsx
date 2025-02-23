import React from 'react';
import { BookOpen, Clock, Award, Brain, Bell, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BrowseCourses from '../../components/course/BrowseCourses';
import EnrolledCourses from '../../components/course/EnrolledCourses';
import PointsDisplay from '../../components/points/PointsDisplay';
import AchievementsDisplay from '../../components/points/AchievementsDisplay';

interface StudentDashboardProps {
  onNavigate: (page: string) => void;
}

interface Stats {
  totalCourses: number;
  studyTime: number;
  achievements: number;
  learningEfficiency: number;
}

export default function StudentDashboard({ onNavigate }: StudentDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0,
    studyTime: 0,
    achievements: 0,
    learningEfficiency: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Get enrolled courses count
      const { count: coursesCount } = await supabase
        .from('course_enrollments')
        .select('*', { count: 'exact' })
        .eq('student_id', user?.id)
        .eq('status', 'enrolled');

      setStats({
        totalCourses: coursesCount || 0,
        studyTime: 0, // Would need activity tracking
        achievements: 0, // Would need achievements system
        learningEfficiency: 0 // Would need analytics integration
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Welcome Back, Student</h1>
          <button className="p-2 relative hover:bg-gray-100 rounded-full">
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">3</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Courses</h3>
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {loading ? '...' : stats.totalCourses}
            </p>
            <p className="text-sm text-gray-500">Active Courses</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Study Time</h3>
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">0h</p>
            <p className="text-sm text-gray-500">This Week</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Achievements</h3>
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-yellow-600">0</p>
            <p className="text-sm text-gray-500">Badges Earned</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">AI Insights</h3>
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">-</p>
            <p className="text-sm text-gray-500">Learning Efficiency</p>
          </div>
        </div>
        
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Your Courses</h2>
          </div>
          <EnrolledCourses onNavigate={onNavigate} />
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Available Courses</h2>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          
          <BrowseCourses onNavigate={onNavigate} />
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PointsDisplay studentId={user?.id || ''} />
        <AchievementsDisplay studentId={user?.id || ''} />
      </div>
    </div>
  );
}