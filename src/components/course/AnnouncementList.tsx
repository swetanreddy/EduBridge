import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  professor: {
    name: string;
  };
}

interface AnnouncementListProps {
  courseId: string;
}

export default function AnnouncementList({ courseId }: AnnouncementListProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, [courseId]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_course_announcements', {
          p_course_id: courseId
        });

      if (error) throw error;

      setAnnouncements(data?.map(announcement => ({
        ...announcement,
        professor: { name: announcement.professor_name || 'Unknown' }
      })) || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
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

  if (announcements.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-xl shadow-sm">
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Announcements</h3>
        <p className="text-gray-500">Check back later for course updates</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2">{announcement.title}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(announcement.created_at).toLocaleDateString()}
              </div>
              <span>by {announcement.professor.name}</span>
            </div>
            <p className="text-gray-600 whitespace-pre-wrap">{announcement.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}