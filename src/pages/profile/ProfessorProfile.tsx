import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Mail, Building2, Award, Users, FileText, Brain, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ProfessorStats {
  totalCourses: number;
  totalStudents: number;
  averageScore: number;
  totalAssignments: number;
}

export default function ProfessorProfile() {
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<ProfessorStats>({
    totalCourses: 0,
    totalStudents: 0,
    averageScore: 0,
    totalAssignments: 0
  });
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    institution: user?.user_metadata?.institution || '',
    department: user?.user_metadata?.department || '',
    specialization: user?.user_metadata?.specialization || '',
    qualifications: user?.user_metadata?.qualifications || '',
    bio: user?.user_metadata?.bio || '',
    officeHours: user?.user_metadata?.officeHours || '',
    researchInterests: user?.user_metadata?.researchInterests || ''
  });

  useEffect(() => {
    if (user) {
      fetchProfessorStats();
    }
  }, [user]);

  const fetchProfessorStats = async () => {
    try {
      // Get courses count
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('professor_id', user?.id);

      const courseIds = courses?.map(c => c.id) || [];

      // Get total students
      const { count: studentsCount } = await supabase
        .from('course_enrollments')
        .select('*', { count: 'exact' })
        .in('course_id', courseIds)
        .eq('status', 'enrolled');

      // Get assignments
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .in('course_id', courseIds);

      // Get average score
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('score')
        .in('assignment_id', assignments?.map(a => a.id) || []);

      const totalSubmissions = submissions?.length || 0;
      const averageScore = submissions?.reduce((acc, sub) => acc + sub.score, 0) / totalSubmissions || 0;

      setStats({
        totalCourses: courses?.length || 0,
        totalStudents: studentsCount || 0,
        averageScore: Math.round(averageScore * 10) / 10,
        totalAssignments: assignments?.length || 0
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
          department: formData.department,
          specialization: formData.specialization,
          qualifications: formData.qualifications,
          bio: formData.bio,
          officeHours: formData.officeHours,
          researchInterests: formData.researchInterests
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
            <div className="h-32 bg-gradient-to-r from-purple-500 to-indigo-500" />
            
            <div className="relative px-6 pb-6">
              <div className="flex justify-center -mt-12 mb-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <BookOpen className="w-12 h-12 text-purple-600" />
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
                      className="text-2xl font-bold text-center border-b border-gray-300 focus:border-purple-500 focus:outline-none"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold">{formData.name}</h1>
                  )}
                  <p className="text-gray-500 flex items-center justify-center gap-2 mt-1">
                    <BookOpen className="w-4 h-4" />
                    Professor
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
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
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
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                          />
                        ) : (
                          <span className="text-gray-900">{formData.institution}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <div className="mt-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                          />
                        ) : (
                          <span className="text-gray-900">{formData.department}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Specialization</label>
                      <div className="mt-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.specialization}
                            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                          />
                        ) : (
                          <span className="text-gray-900">{formData.specialization}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Qualifications</label>
                      <div className="mt-1">
                        {isEditing ? (
                          <textarea
                            value={formData.qualifications}
                            onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                            rows={3}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                          />
                        ) : (
                          <p className="text-gray-900">{formData.qualifications}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Office Hours</label>
                      <div className="mt-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.officeHours}
                            onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                            placeholder="e.g., Mon/Wed 2-4 PM"
                          />
                        ) : (
                          <span className="text-gray-900">{formData.officeHours || 'Not specified'}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Research Interests</label>
                      <div className="mt-1">
                        {isEditing ? (
                          <textarea
                            value={formData.researchInterests}
                            onChange={(e) => setFormData({ ...formData, researchInterests: e.target.value })}
                            rows={3}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                          />
                        ) : (
                          <p className="text-gray-900">{formData.researchInterests || 'Not specified'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Bio</label>
                  <div className="mt-1">
                    {isEditing ? (
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={4}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      />
                    ) : (
                      <p className="text-gray-900">{formData.bio || 'No bio provided'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      <span className="text-2xl font-bold text-purple-600">{stats.totalCourses}</span>
                    </div>
                    <p className="text-sm text-gray-600">Active Courses</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="text-2xl font-bold text-blue-600">{stats.totalStudents}</span>
                    </div>
                    <p className="text-sm text-gray-600">Total Students</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      <span className="text-2xl font-bold text-green-600">{stats.totalAssignments}</span>
                    </div>
                    <p className="text-sm text-gray-600">Assignments</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <Brain className="w-5 h-5 text-yellow-600" />
                      <span className="text-2xl font-bold text-yellow-600">{stats.averageScore}%</span>
                    </div>
                    <p className="text-sm text-gray-600">Avg. Score</p>
                  </div>
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
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
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