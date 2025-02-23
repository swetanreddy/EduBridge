import React from 'react';
import { Users, Building2, GraduationCap, BarChart3, Bell, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Stats {
  totalUsers: number;
  totalDepartments: number;
  totalProfessors: number;
  platformUsage: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDepartments: 0,
    totalProfessors: 0,
    platformUsage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total users count
      const { count: usersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact' });

      // Get professors count
      const { count: professorsCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'professor');

      // Get unique departments count
      const { data: departments } = await supabase
        .from('user_profiles')
        .select('department')
        .not('department', 'is', null);

      const uniqueDepartments = new Set(departments?.map(d => d.department));

      setStats({
        totalUsers: usersCount || 0,
        totalDepartments: uniqueDepartments.size,
        totalProfessors: professorsCount || 0,
        platformUsage: 92 // This would need real analytics integration
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
          <h1 className="text-3xl font-bold">Welcome Back, Admin</h1>
          <button className="p-2 relative hover:bg-gray-100 rounded-full">
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">7</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Total Users</h3>
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-blue-600">
                {loading ? '...' : stats.totalUsers}
              </p>
            </div>
            <p className="text-sm text-gray-500">Active Users</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Departments</h3>
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-green-600">
                {loading ? '...' : stats.totalDepartments}
              </p>
            </div>
            <p className="text-sm text-gray-500">Active Departments</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Professors</h3>
              <GraduationCap className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-yellow-600">
                {loading ? '...' : stats.totalProfessors}
              </p>
            </div>
            <p className="text-sm text-gray-500">Teaching Staff</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Analytics</h3>
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-purple-600">
                {loading ? '...' : `${stats.platformUsage}%`}
              </p>
            </div>
            <p className="text-sm text-gray-500">Platform Usage</p>
          </div>
        </div>
      </div>
    </div>
  );
}