import React, { useState, useEffect } from 'react';
import { Users, Calendar, BookOpen, Bell, FileText, Brain, ChevronLeft, Clock, GraduationCap } from 'lucide-react';
import MaterialList from '../../components/course/MaterialList';
import AssignmentList from '../../components/course/AssignmentList';
import AnnouncementList from '../../components/course/AnnouncementList';
import AssignmentHistory from '../../components/course/AssignmentHistory';
import CourseAIChat from '../../components/course/CourseAIChat';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type AssignmentTab = 'upcoming' | 'history';

interface Course {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  max_students: number;
  student_count: number;
  professor_name: string;
}

interface StudentCoursePageProps {
  courseId: string;
  onNavigate: (page: string) => void;
}

export default function StudentCoursePage({ courseId, onNavigate }: StudentCoursePageProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [assignmentTab, setAssignmentTab] = useState<AssignmentTab>('upcoming');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Remove auto-scroll effect
  useEffect(() => {
    if (user) {
      fetchCourse();
    }
  }, [user, courseId]);

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_enrolled_courses', { p_student_id: user?.id });

      if (error) throw error;

      const courseData = data?.find(c => c.id === courseId);
      if (courseData) {
        setCourse(courseData);
      }
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
        {/* Course Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              onNavigate('home');
            }}
            className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors mb-4 group"
          >
            <ChevronLeft className="w-5 h-5 mr-1 transform group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
              <p className="text-gray-600 max-w-2xl">{course.description}</p>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center gap-3 text-gray-500">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <span>Professor {course.professor_name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-gray-500">Students</p>
                <span className="font-medium text-gray-900">
                  {course.student_count} Students
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <span className="font-medium text-gray-900">
                  {new Date(course.start_date).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <span className="font-medium text-gray-900">
                  {Math.ceil((new Date(course.end_date).getTime() - new Date(course.start_date).getTime()) / (1000 * 60 * 60 * 24 * 7))} weeks
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-xs text-gray-500">End Date</p>
                <span className="font-medium text-gray-900">
                  {new Date(course.end_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Announcements */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Bell className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-900">Announcements</h2>
              </div>
              <div className="divide-y divide-gray-100">
                <AnnouncementList courseId={courseId} />
              </div>
            </div>

            {/* Course Materials */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900">Course Materials</h2>
              </div>
              <div className="divide-y divide-gray-100">
                <MaterialList courseId={courseId} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            {/* Assignments */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-6 h-6 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Assignments</h2>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex rounded-lg border border-gray-200 p-1">
                  <button
                    onClick={() => setAssignmentTab('upcoming')}
                    className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${
                      assignmentTab === 'upcoming'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Upcoming
                  </button>
                  <button
                    onClick={() => setAssignmentTab('history')}
                    className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${
                      assignmentTab === 'history'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    History
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {assignmentTab === 'upcoming' ? (
                  <AssignmentList courseId={courseId} />
                ) : (
                  <AssignmentHistory courseId={courseId} />
                )}
              </div>
            </div>

            {/* AI Assistant */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Brain className="w-6 h-6 text-yellow-600" />
                <h2 className="text-xl font-semibold text-gray-900">AI Assistant</h2>
              </div>
              <div className="h-[500px] overflow-y-auto rounded-lg border border-gray-100">
                <CourseAIChat courseId={courseId} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}