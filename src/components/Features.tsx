import React from 'react';
import { BookOpen, GraduationCap, Brain, Award, BarChart3, Users, Clock, Target } from 'lucide-react';

const features = [
  {
    name: 'AI-Powered Learning',
    description: 'Get personalized study recommendations and instant feedback powered by advanced AI algorithms.',
    icon: Brain,
    color: 'text-purple-600 bg-purple-100'
  },
  {
    name: 'Real-time Analytics',
    description: 'Track your progress with detailed analytics and performance insights.',
    icon: BarChart3,
    color: 'text-blue-600 bg-blue-100'
  },
  {
    name: 'Interactive Courses',
    description: 'Engage with dynamic course content and collaborative learning tools.',
    icon: BookOpen,
    color: 'text-indigo-600 bg-indigo-100'
  },
  {
    name: 'Achievement System',
    description: 'Earn badges and certificates as you progress through your learning journey.',
    icon: Award,
    color: 'text-yellow-600 bg-yellow-100'
  },
  {
    name: 'Study Groups',
    description: 'Connect with fellow students and form study groups for collaborative learning.',
    icon: Users,
    color: 'text-green-600 bg-green-100'
  },
  {
    name: 'Flexible Learning',
    description: 'Learn at your own pace with flexible schedules and deadlines.',
    icon: Clock,
    color: 'text-red-600 bg-red-100'
  }
];

export default function Features() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">Everything you need</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Transform Your Learning Experience
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Our platform combines cutting-edge technology with proven educational methods to deliver an unmatched learning experience.
          </p>
        </div>
        
        <div className="mx-auto mt-16 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
              >
                <div className={`inline-flex rounded-lg p-3 ${feature.color}`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">
                  {feature.name}
                </h3>
                <p className="mt-3 text-base text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}