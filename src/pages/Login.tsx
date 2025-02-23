import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import LoginForm from '../components/auth/LoginForm';
import RoleSelect from '../components/auth/RoleSelect';
import { useEffect } from 'react';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, user } = useAuth();

  useEffect(() => {
    if (user) {
      window.location.href = '/';
    }
  }, [user]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signIn(email, password);
      // Successful login will trigger auth state change
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  }, [signIn]);

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
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
          <LoginForm
            onSubmit={handleLogin}
            isLoading={isLoading}
          />
        )}
      </div>
    </AuthLayout>
  );
}