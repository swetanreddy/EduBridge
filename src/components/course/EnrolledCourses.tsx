import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Calendar, ChevronRight } from 'lucide-react';
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
  professor_name: string;
  student_count: number;
}

interface EnrolledCoursesProps {
  onNavigate: (page: string) => void;
}

export default function EnrolledCourses({ onNavigate }: EnrolledCoursesProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEnrolledCourses();
    }
  }, [user]);

  const fetchEnrolledCourses = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_enrolled_courses', { p_student_id: user?.id });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (courseId: string) => {
    window.history.pushState({}, '', `/course/${courseId}`);
    onNavigate('course');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Enrolled Courses</h3>
        <p className="text-gray-500">Browse available courses to enroll</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <div
          key={course.id}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
          onClick={() => handleCourseClick(course.id)}
        >
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
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
                {course.student_count} Students
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(course.start_date).toLocaleDateString()}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Professor: {course.professor_name}
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}