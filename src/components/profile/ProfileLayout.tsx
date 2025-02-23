import React from 'react';
import { User } from '@supabase/supabase-js';
import { UserCircle } from 'lucide-react';

interface ProfileLayoutProps {
  user: User;
  children: React.ReactNode;
}

export default function ProfileLayout({ user, children }: ProfileLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-32" />
            <div className="px-6 pb-6">
              <div className="flex justify-center -mt-12 mb-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <UserCircle className="w-20 h-20 text-gray-400" />
                  </div>
                </div>
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}