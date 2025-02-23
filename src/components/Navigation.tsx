import React from 'react';
import { Brain, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface NavigationProps {
  onNavigate: (page: string) => void;
}

export default function Navigation({ onNavigate }: NavigationProps) {
  const { user, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      
      // Sign out
      await signOut();
      
      // Reset navigation
      window.history.replaceState({}, '', '/');
      onNavigate('home');
      
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <nav className="fixed w-full bg-white/80 backdrop-blur-sm z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <div className="flex items-center">
              <Brain className="w-8 h-8 mr-2" />
              <div>
                <span className="text-xl font-bold">EduBridge</span>
                <span className="text-sm text-indigo-400 ml-1">Tufts</span>
              </div>
            </div>
          </button>

          <div className="flex items-center space-x-4">
            {loading || signingOut ? (
              <Loader className="w-5 h-5 animate-spin text-gray-600" />
            ) : user && (
              <>
                {user.user_metadata?.role === 'professor' && (
                  <button
                    onClick={() => onNavigate('courses')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Courses
                  </button>
                )}
                <div className="flex items-center">
                  <button
                    onClick={() => onNavigate('profile')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}