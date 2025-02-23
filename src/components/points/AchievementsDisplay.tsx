import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AchievementsDisplayProps {
  studentId: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  points_reward: number;
  progress: {
    current: number;
    required: number;
  };
  unlocked_at: string | null;
}

export default function AchievementsDisplay({ studentId }: AchievementsDisplayProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAchievement, setExpandedAchievement] = useState<string | null>(null);

  useEffect(() => {
    fetchAchievements();
  }, [studentId]);

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('student_achievements')
        .select(`
          achievement:achievement_id (
            id,
            name,
            description,
            icon_url,
            points_reward
          ),
          progress,
          unlocked_at
        `)
        .eq('student_id', studentId)
        .order('unlocked_at', { ascending: false, nullsLast: true });

      if (error) throw error;

      setAchievements(
        data?.map(item => ({
          id: item.achievement.id,
          name: item.achievement.name,
          description: item.achievement.description,
          icon_url: item.achievement.icon_url,
          points_reward: item.achievement.points_reward,
          progress: item.progress,
          unlocked_at: item.unlocked_at
        })) || []
      );
    } catch (error) {
      console.error('Error fetching achievements:', error);
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
          <Medal className="w-6 h-6 text-yellow-500 mr-2" />
          Achievements
        </h2>
        <div className="text-sm text-gray-600">
          {achievements.filter(a => a.unlocked_at).length} / {achievements.length} Unlocked
        </div>
      </div>

      <div className="space-y-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`rounded-lg border transition-all ${
              achievement.unlocked_at
                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    achievement.unlocked_at
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {achievement.unlocked_at ? (
                      <Trophy className="w-5 h-5" />
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{achievement.name}</h3>
                    <div className="text-sm text-gray-600">
                      {achievement.points_reward} points reward
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedAchievement(
                    expandedAchievement === achievement.id ? null : achievement.id
                  )}
                  className="p-1 hover:bg-white rounded-full transition-colors"
                >
                  {expandedAchievement === achievement.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>

              {expandedAchievement === achievement.id && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-gray-600 mb-3">
                    {achievement.description}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Progress</span>
                      <span>
                        {achievement.progress.current} / {achievement.progress.required}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          achievement.unlocked_at
                            ? 'bg-yellow-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{
                          width: `${Math.min(
                            (achievement.progress.current / achievement.progress.required) * 100,
                            100
                          )}%`
                        }}
                      />
                    </div>
                    {achievement.unlocked_at && (
                      <div className="text-sm text-green-600">
                        Unlocked on {new Date(achievement.unlocked_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}