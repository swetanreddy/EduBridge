import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Calendar, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Course {
  id: string;
  title: string;
  description: string;
  professor_id: string;
  start_date: string;
  end_date: string;
  max_students: number;
  professor: {
    name: string;
  };
  student_count: number;
  is_enrolled?: boolean;
  enrollment_status?: string;
}

interface BrowseCoursesProps {
  onNavigate: (page: string) => void;
}

export default function BrowseCourses({ onNavigate }: BrowseCoursesProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const handleCourseClick = (courseId: string) => {
    window.history.pushState({}, '', `/course/${courseId}`);
    onNavigate('course');
  };

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    try {
      // Get all courses with professor names and enrollment counts
      const { data, error } = await supabase
        .rpc('get_course_details', { p_student_id: user?.id })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out courses where the student is already enrolled
      const availableCourses = data?.filter(course => 
        course.enrollment_status !== 'enrolled'
      ) || [];

      setCourses(availableCourses.map(course => ({
        ...course,
        professor: { name: course.professor_name || 'Unknown Professor' },
        is_enrolled: !!course.enrollment_status
      })));
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!user?.id) {
      alert('You must be logged in to enroll in courses');
      return;
    }
  
    setEnrolling(courseId);
    try {
      const { data, error } = await supabase.rpc('request_enrollment', {
        p_course_id: courseId,
        p_student_id: user.id
      });
  
      if (error) {
        throw new Error(error.message || 'Failed to enroll in course');
      }
  
      if (!data || !data.success) {
        throw new Error(data?.message || 'Failed to enroll in course');
      }
  
      alert(data.message);
      await fetchCourses(); // Refresh the course list
    } catch (error) {
      console.error('Error enrolling in course:', error);
      alert(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setEnrolling(null);
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
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
          onClick={() => handleCourseClick(course.id)}
          onClick={() => handleCourseClick(course.id)}
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {course.title}
                  </h3>
                </div>
                <p className="mt-2 text-gray-600">{course.description}</p>
                
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {course.student_count} / {course.max_students} Students
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(course.start_date).toLocaleDateString()} - {new Date(course.end_date).toLocaleDateString()}
                  </div>
                  <div className="text-gray-600">
                    Professor: {course.professor.name}
                  </div>
                </div>
              </div>
              
              <div className="ml-4">
                {course.is_enrolled ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {course.enrollment_status === 'pending' ? 'Pending' : 'Enrolled'}
                  </div>
                ) : course.student_count >= course.max_students ? (
                  <div className="flex items-center text-red-600">
                    <XCircle className="w-5 h-5 mr-2" />
                    Full
                  </div>
                ) : (
                  <button
                    onClick={() => handleEnroll(course.id)}
                    disabled={enrolling === course.id}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                      disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {enrolling === course.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Enrolling...
                      </>
                    ) : (
                      'Enroll Now'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {courses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Courses Available</h3>
          <p className="text-gray-500">Check back later for new courses</p>
        </div>
      )}
    </div>
  );
}