import React from 'react';
import { Brain, LineChart as ChartLine, Target, Sparkles } from 'lucide-react';

export default function AIInsights() {
  return (
    <section className="py-20 bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">AI-Driven Learning Insights</h2>
            <div className="space-y-6">
              <div className="flex items-start">
                <Brain className="w-6 h-6 text-indigo-600 mt-1 mr-4" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Personalized Learning Paths</h3>
                  <p className="text-gray-600">Our AI analyzes your learning style and progress to create tailored study plans.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <ChartLine className="w-6 h-6 text-purple-600 mt-1 mr-4" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
                  <p className="text-gray-600">Real-time analytics and insights to monitor your academic journey.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Target className="w-6 h-6 text-blue-600 mt-1 mr-4" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Smart Goals</h3>
                  <p className="text-gray-600">AI-powered goal setting and achievement tracking.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-white rounded-xl shadow-2xl p-6 transform hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Learning Dashboard</h3>
                <Sparkles className="w-6 h-6 text-yellow-500" />
              </div>
              
              <div className="space-y-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 w-3/4 rounded-full" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <p className="text-sm text-gray-600">Course Progress</p>
                    <p className="text-2xl font-bold text-indigo-600">75%</p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Study Time</p>
                    <p className="text-2xl font-bold text-purple-600">12.5h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}