import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProfileLayout from '../../components/profile/ProfileLayout';
import { Building2, Mail, Phone, Shield, Briefcase } from 'lucide-react';

export default function AdminProfile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    institution: user?.user_metadata?.institution || '',
    department: user?.user_metadata?.department || '',
    position: user?.user_metadata?.position || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Update profile logic
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <ProfileLayout user={user}>
      <form onSubmit={handleSubmit}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-center border-b border-gray-300 focus:border-indigo-500 focus:outline-none"
              />
            ) : (
              formData.name
            )}
          </h1>
          <p className="text-gray-500 flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            University Admin
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-gray-900">{formData.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <div className="mt-1 flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-2" />
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
          </div>

          <div className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700">Position</label>
              <div className="mt-1 flex items-center">
                <Briefcase className="w-5 h-5 text-gray-400 mr-2" />
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <span className="text-gray-900">{formData.position}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
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
    </ProfileLayout>
  );
}