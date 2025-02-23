import React from 'react';
import { GraduationCap, BookOpen, Building2 } from 'lucide-react';

const roles = [
  {
    id: 'student',
    title: 'Student',
    icon: GraduationCap,
    description: 'Access your courses, track progress, and get personalized recommendations',
    color: 'border-blue-600 hover:bg-blue-50'
  },
  {
    id: 'professor',
    title: 'Professor',
    icon: BookOpen,
    description: 'Manage courses, create content, and track student performance',
    color: 'border-purple-600 hover:bg-purple-50'
  }
];

interface RoleSelectProps {
  selectedRole: string;
  onRoleSelect: (role: string) => void;
}

export default function RoleSelect({ selectedRole, onRoleSelect }: RoleSelectProps) {
  return (
    <div className="grid gap-4">
      {roles.map((role) => {
        const Icon = role.icon;
        const isSelected = selectedRole === role.id;
        
        return (
          <button
            key={role.id}
            onClick={() => onRoleSelect(role.id)}
            className={`p-4 border-2 rounded-lg text-left transition-all duration-300
              ${role.color} ${isSelected ? 'ring-2 ring-offset-2 ring-indigo-600' : ''}`}
          >
            <div className="flex items-center gap-4">
              <Icon className="w-8 h-8" />
              <div>
                <h3 className="font-semibold text-lg">{role.title}</h3>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}