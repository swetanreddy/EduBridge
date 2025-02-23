import React, { useState, useEffect } from 'react';
import { Trophy, Star, Target, Users, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PointsDisplayProps {
  studentId: string;
}

interface PointSummary {
  category: string;
  total: number;
  icon: React.ReactNode;
  color: string;
}

export default function PointsDisplay({ studentId }: PointsDisplayProps) {
  const [points, setPoints] = useState<PointSummary[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPoints();
  }, [studentId]);

  const fetchPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('student_points_summary')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error) throw error;

      const pointsByCategory = data?.points_by_category || {
        assignment: 0,
        quiz: 0,
        participation: 0,
        community: 0,
        bonus: 0
      };

      // Create summary with icons and colors
      const summary: PointSummary[] = [
        {
          category: 'Assignment',
          total: parseInt(pointsByCategory.assignment) || 0,
          icon: <Target className="w-5 h-5" />,
          color: 'text-blue-600 bg-blue-100'
        },
        {
          category: 'Quiz',
          total: parseInt(pointsByCategory.quiz) || 0,
          icon: <Star className="w-5 h-5" />,
          color: 'text-purple-600 bg-purple-100'
        },
        {
          category: 'Participation',
          total: parseInt(pointsByCategory.participation) || 0,
          icon: <Users className="w-5 h-5" />,
          color: 'text-green-600 bg-green-100'
        },
        {
          category: 'Bonus',
          total: parseInt(pointsByCategory.bonus) || 0,
          icon: <Sparkles className="w-5 h-5" />,
          color: 'text-yellow-600 bg-yellow-100'
        }
      ];

      setPoints(summary);
      setTotalPoints(data?.total_points || 0);
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
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
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
          EduPoints
        </h2>
        <div className="text-2xl font-bold text-indigo-600">
          {totalPoints} Points
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {points.map((category) => (
          <div
            key={category.category}
            className="p-4 rounded-lg border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${category.color}`}>
                {category.icon}
              </div>
              <div>
                <div className="text-sm text-gray-600">{category.category}</div>
                <div className="font-semibold">{category.total} pts</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}