import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import RoleSelect from '../components/auth/RoleSelect';
import SignupForm from '../components/auth/SignupForm';

export default function Signup() {
  const [selectedRole, setSelectedRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuth();

  const handleSignup = useCallback(async (data: any) => {
    setIsLoading(true);
    setError(null);

    try {
      await signUp(data.email, data.password, {
        role: selectedRole,
        name: data.name,
        institution: data.institution,
        course: data.course,
      });
      // Successful signup will trigger auth state change
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  }, [signUp, selectedRole]);

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join our platform to start your learning journey"
    >
      <div className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {error}
          </div>
        )}
        <RoleSelect
          selectedRole={selectedRole}
          onRoleSelect={setSelectedRole}
        />
        
        {selectedRole && (
          <SignupForm
            role={selectedRole}
            onSubmit={handleSignup}
            isLoading={isLoading}
          />
        )}
      </div>
    </AuthLayout>
  );
}