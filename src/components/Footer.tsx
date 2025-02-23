import React from 'react';
import { Facebook, Twitter, Linkedin, Mail, Phone } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">EduAI Platform</h3>
            <p className="text-gray-400">Transforming education through AI-powered insights and personalized learning.</p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavigate('login')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Sign In
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('signup')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Create Account
                </button>
              </li>
              <li>
                <button className="text-gray-400 hover:text-white transition-colors">
                  Features
                </button>
              </li>
              <li>
                <button className="text-gray-400 hover:text-white transition-colors">
                  Contact
                </button>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <div className="space-y-2">
              <p className="flex items-center text-gray-400">
                <Mail className="w-5 h-5 mr-2" />
                contact@eduai.com
              </p>
              <p className="flex items-center text-gray-400">
                <Phone className="w-5 h-5 mr-2" />
                +1 (555) 123-4567
              </p>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 EduAI Platform. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}