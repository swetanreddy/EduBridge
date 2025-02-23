import React, { useState, useEffect } from 'react';
import { Award, Download, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Badge {
  id: string;
  name: string;
  description: string;
  image_url: string;
  earned_at: string;
  certificate_url: string;
  course_title: string;
}

interface StudentBadgesProps {
  studentId: string;
}

export default function StudentBadges({ studentId }: StudentBadgesProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [studentId]);

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('student_badges')
        .select(`
          id,
          earned_at,
          certificate_url,
          badges (
            id,
            name,
            description,
            image_url
          ),
          courses (
            title
          )
        `)
        .eq('student_id', studentId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      setBadges(data?.map(badge => ({
        id: badge.badges.id,
        name: badge.badges.name,
        description: badge.badges.description,
        image_url: badge.badges.image_url,
        earned_at: badge.earned_at,
        certificate_url: badge.certificate_url,
        course_title: badge.courses.title
      })) || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-xl shadow-sm">
        <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Badges Yet</h3>
        <p className="text-gray-500">Complete courses to earn badges and certificates</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <img
                src={badge.image_url}
                alt={badge.name}
                className="w-24 h-24 object-contain"
              />
            </div>
            
            <h3 className="text-lg font-semibold text-center mb-2">
              {badge.name}
            </h3>
            
            <p className="text-sm text-gray-600 text-center mb-4">
              {badge.description}
            </p>
            
            <div className="text-sm text-gray-500 text-center mb-4">
              Earned on {new Date(badge.earned_at).toLocaleDateString()}
            </div>
            
            <div className="flex justify-center">
              <a
                href={badge.certificate_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg
                  hover:bg-indigo-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                View Certificate
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}