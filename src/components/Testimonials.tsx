import React from 'react';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Computer Science Student',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80',
    quote: 'The AI-powered study recommendations have completely transformed how I learn. My grades have improved significantly since using this platform!',
    stars: 5
  },
  {
    name: 'Dr. Michael Chen',
    role: 'Professor of Mathematics',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80',
    quote: 'As an educator, this platform has revolutionized how I interact with students. The analytics help me identify and address learning gaps effectively.',
    stars: 5
  },
  {
    name: 'Emily Roberts',
    role: 'Biology Major',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80',
    quote: 'The interactive features and study groups have made learning so much more engaging. I love how I can track my progress in real-time.',
    stars: 5
  }
];

export default function Testimonials() {
  return (
    <div className="bg-gray-900 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-400">Testimonials</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Loved by Students and Educators
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Hear from our community about how our platform has transformed their educational journey.
          </p>
        </div>
        
        <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="relative overflow-hidden rounded-2xl bg-white/5 p-8 backdrop-blur-sm transition-all duration-200 hover:bg-white/10"
            >
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-white">{testimonial.name}</h3>
                  <p className="text-sm text-indigo-300">{testimonial.role}</p>
                </div>
              </div>
              
              <div className="flex gap-1 mt-4">
                {[...Array(testimonial.stars)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <blockquote className="mt-4">
                <p className="text-base italic text-gray-300">
                  "{testimonial.quote}"
                </p>
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}