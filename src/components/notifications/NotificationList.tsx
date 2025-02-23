import React from 'react';
import { Bell, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

interface NotificationListProps {
  onClose: () => void;
}

export default function NotificationList({ onClose }: NotificationListProps) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentResponse = async (
    enrollmentId: string,
    notificationId: string,
    approved: boolean
  ) => {
    setProcessing(notificationId);
    try {
      const { error } = await supabase.rpc('handle_enrollment_response', {
        p_enrollment_id: enrollmentId,
        p_approved: approved
      });

      if (error) throw error;

      // Mark notification as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      fetchNotifications();
    } catch (error) {
      console.error('Error handling enrollment response:', error);
      alert('Failed to process enrollment response. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="w-5 h-5 text-indigo-600 mr-2" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No notifications
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.read ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{notification.title}</h3>
                      <p className="text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {notification.type === 'enrollment_request' && !notification.read && (
                    <div className="mt-4 flex space-x-3">
                      <button
                        onClick={() => handleEnrollmentResponse(
                          notification.data.enrollment_id,
                          notification.id,
                          true
                        )}
                        disabled={!!processing}
                        className="flex items-center px-3 py-1 bg-green-600 text-white rounded-lg
                          hover:bg-green-700 disabled:opacity-50"
                      >
                        {processing === notification.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleEnrollmentResponse(
                          notification.data.enrollment_id,
                          notification.id,
                          false
                        )}
                        disabled={!!processing}
                        className="flex items-center px-3 py-1 bg-red-600 text-white rounded-lg
                          hover:bg-red-700 disabled:opacity-50"
                      >
                        {processing === notification.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-2" />
                        )}
                        Reject
                      </button>
                    </div>
                  )}

                  {!notification.read && notification.type !== 'enrollment_request' && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="mt-4 text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}