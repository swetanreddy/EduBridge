import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, Mail, Building2, BookOpen, Clock, Award, Brain } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StudentBadges from '../../components/course/StudentBadges';

interface StudentStats {
  totalCourses: number;
  averageScore: number;
  completedAssignments: number;
  studyTime: number;
}

export default function StudentProfile() {
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<StudentStats>({
    totalCourses: 0,
    averageScore: 0,
    completedAssignments: 0,
    studyTime: 0
  });
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    institution: user?.user_metadata?.institution || '',
    course: user?.user_metadata?.course || '',
    year: user?.user_metadata?.year || '',
    bio: user?.user_metadata?.bio || ''
  });

  useEffect(() => {
    if (user) {
      fetchStudentStats();
    }
  }, [user]);

  const fetchStudentStats = async () => {
    try {
      // Get enrolled courses count
      const { count: coursesCount } = await supabase
        .from('course_enrollments')
        .select('*', { count: 'exact' })
        .eq('student_id', user?.id)
        .eq('status', 'enrolled');

      // Get assignment submissions
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('score')
        .eq('student_id', user?.id);

      const totalSubmissions = submissions?.length || 0;
      const averageScore = submissions?.reduce((acc, sub) => acc + sub.score, 0) / totalSubmissions || 0;

      setStats({
        totalCourses: coursesCount || 0,
        averageScore: Math.round(averageScore * 10) / 10,
        completedAssignments: totalSubmissions,
        studyTime: 0 // Would need activity tracking
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
          phone: formData.phone,
          institution: formData.institution,
          course: formData.course,
          year: formData.year,
          bio: formData.bio
        }
      });

      if (error) throw error;
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-500" />
            
            <div className="relative px-6 pb-6">
              <div className="flex justify-center -mt-12 mb-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-12 h-12 text-indigo-600" />
                  </div>
                  <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="text-center">
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="text-2xl font-bold text-center border-b border-gray-300 focus:border-indigo-500 focus:outline-none"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold">{formData.name}</h1>
                  )}
                  <p className="text-gray-500 flex items-center justify-center gap-2 mt-1">
                    <GraduationCap className="w-4 h-4" />
                    Student
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <div className="mt-1 flex items-center">
                        <Mail className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-gray-900">{formData.email}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <div className="mt-1">
                        {isEditing ? (
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-gray-900">{formData.phone || 'Not provided'}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Institution</label>
                      <div className="mt-1 flex items-center">
                        <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.institution}
                            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-gray-900">{formData.institution}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Course/Major</label>
                      <div className="mt-1 flex items-center">
                        <BookOpen className="w-5 h-5 text-gray-400 mr-2" />
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.course}
                            onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-gray-900">{formData.course}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Year</label>
                      <div className="mt-1">
                        {isEditing ? (
                          <select
                            value={formData.year}
                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="">Select Year</option>
                            <option value="1">First Year</option>
                            <option value="2">Second Year</option>
                            <option value="3">Third Year</option>
                            <option value="4">Fourth Year</option>
                            <option value="5">Fifth Year</option>
                          </select>
                        ) : (
                          <span className="text-gray-900">
                            {formData.year ? `Year ${formData.year}` : 'Not specified'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bio</label>
                      <div className="mt-1">
                        {isEditing ? (
                          <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            rows={3}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        ) : (
                          <p className="text-gray-900">{formData.bio || 'No bio provided'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <span className="text-2xl font-bold text-blue-600">{stats.totalCourses}</span>
                    </div>
                    <p className="text-sm text-gray-600">Active Courses</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <span className="text-2xl font-bold text-purple-600">{stats.averageScore}%</span>
                    </div>
                    <p className="text-sm text-gray-600">Average Score</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <Award className="w-5 h-5 text-yellow-600" />
                      <span className="text-2xl font-bold text-yellow-600">{stats.completedAssignments}</span>
                    </div>
                    <p className="text-sm text-gray-600">Completed Tasks</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-5 h-5 text-green-600" />
                      <span className="text-2xl font-bold text-green-600">{stats.studyTime}h</span>
                    </div>
                    <p className="text-sm text-gray-600">Study Time</p>
                  </div>
                </div>

                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">Achievements & Badges</h2>
                  <StudentBadges studentId={user.id} />
                </div>

                <div className="flex justify-between items-center mt-8">
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                  
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="mr-4 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}