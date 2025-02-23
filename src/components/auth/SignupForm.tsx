import React, { useState } from 'react';
import { Mail, Lock, User, Building, BookOpen, Loader } from 'lucide-react';

interface SignupFormProps {
  role: string;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export default function SignupForm({ role, onSubmit, isLoading = false }: SignupFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    institution: '',
    course: '',
    credentials: null
  });

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < getMaxSteps()) {
      setStep(step + 1);
    } else {
      onSubmit(formData);
    }
  };

  const getMaxSteps = () => {
    switch (role) {
      case 'student':
        return 2;
      case 'professor':
        return 3;
      case 'admin':
        return 2;
      default:
        return 1;
    }
  };

  const renderStep1 = () => (
    <>
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => updateForm('name', e.target.value)}
              className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => updateForm('email', e.target.value)}
              className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => updateForm('password', e.target.value)}
              className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>
    </>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <label htmlFor="institution" className="block text-sm font-medium text-gray-700">
          Institution
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Building className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="institution"
            type="text"
            required
            value={formData.institution}
            onChange={(e) => updateForm('institution', e.target.value)}
            className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
              focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="University Name"
          />
        </div>
      </div>

      {role === 'student' && (
        <div>
          <label htmlFor="course" className="block text-sm font-medium text-gray-700">
            Course/Major
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <BookOpen className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="course"
              type="text"
              required
              value={formData.course}
              onChange={(e) => updateForm('course', e.target.value)}
              className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Computer Science"
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Upload Credentials
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={(e) => updateForm('credentials', e.target.files?.[0])}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PDF up to 10MB</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {Array.from({ length: getMaxSteps() }).map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 mx-1 rounded-full ${
                index + 1 <= step ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-center text-sm text-gray-600">
          Step {step} of {getMaxSteps()}
        </p>
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      <div className="flex justify-between space-x-4">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm
              font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none
              focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className={`flex-1 flex justify-center py-2 px-4 border border-transparent rounded-lg
            shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed ${step === 1 ? 'w-full' : ''}`}
        >
          {isLoading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : step < getMaxSteps() ? (
            'Next'
          ) : (
            'Create Account'
          )}
        </button>
      </div>
    </form>
  );
}