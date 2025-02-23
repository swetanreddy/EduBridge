import React from 'react';
import { GraduationCap, BookOpen, Brain, ArrowRight } from 'lucide-react';

interface HeroProps {
  onNavigate: (page: string) => void;
}

export default function Hero({ onNavigate }: HeroProps) {
  return (
    <div className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
      
      <div className="absolute inset-y-0 right-0 hidden w-1/2 sm:block">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&q=80"
          alt="Students learning"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/0 to-white" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="mb-8 inline-flex items-center rounded-full bg-indigo-50 px-4 py-1.5">
            <span className="text-sm font-medium text-indigo-600">
              Powered by AI
            </span>
            <div className="mx-2 h-3.5 w-px bg-indigo-200" />
            <Brain className="h-4 w-4 text-indigo-600" />
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Transform Your Learning Journey
          </h1>
          
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Experience education reimagined with AI-powered insights, personalized learning paths, and real-time analytics. Join thousands of students and educators in the future of learning.
          </p>
          
          <div className="mt-10 flex items-center gap-x-6">
            <button
              onClick={() => onNavigate('signup')}
              className="rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-200 transform hover:scale-105"
            >
              Get Started
            </button>
            
            <button
              onClick={() => onNavigate('login')}
              className="group flex items-center gap-2 text-sm font-semibold leading-6 text-gray-900 hover:text-indigo-600 transition-colors"
            >
              Sign In <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                <span className="text-2xl font-bold text-gray-900">10k+</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">Active Students</p>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                <span className="text-2xl font-bold text-gray-900">500+</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">Courses Available</p>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-600" />
                <span className="text-2xl font-bold text-gray-900">95%</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">Success Rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}