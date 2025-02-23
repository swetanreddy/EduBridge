import React from 'react';
import { useAuth } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import ProfessorCourses from './pages/dashboards/ProfessorCourses';
import CoursePage from './pages/dashboards/CoursePage';
import Auth from './pages/Auth';
import Hero from './components/Hero';
import Features from './components/Features';
import AIInsights from './components/AIInsights';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import ProfessorDashboard from './pages/dashboards/ProfessorDashboard';
import StudentProfile from './pages/profile/StudentProfile';
import ProfessorProfile from './pages/profile/ProfessorProfile';
import StudentCoursePage from './pages/dashboards/StudentCoursePage';

export default function App() {
  const [page, setPage] = React.useState(() => {
    const path = window.location.pathname;
    if (path.includes('/course/')) {
      return 'course';
    }
    if (path === '/courses') {
      return 'courses';
    }
    return 'home';
  });
  const { user } = useAuth();

  const getDashboardByRole = () => {
    if (!user?.user_metadata?.role) return null;
    
    try {
      switch (user.user_metadata.role) {
        case 'student':
          return <StudentDashboard onNavigate={setPage} />;
        case 'professor':
          return <ProfessorDashboard onNavigate={setPage} />;
        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering dashboard:', error);
      return null;
    }
  };

  const renderPage = () => {
    switch (page) {
      case 'login':
        return <Login />;
      case 'signup':
        return <Signup />;
      case 'courses':
        if (user?.user_metadata?.role === 'professor') {
          return <ProfessorCourses onNavigate={setPage} />;
        }
        return null;
      case 'course':
        const courseId = window.location.pathname.split('/course/')[1];
        if (user?.user_metadata?.role === 'professor') {
          return <CoursePage courseId={courseId} onNavigate={setPage} />;
        } else if (user?.user_metadata?.role === 'student') {
          return <StudentCoursePage courseId={courseId} onNavigate={setPage} />;
        }
        return null;
      case 'profile':
        if (!user) return null;
        switch (user?.user_metadata?.role) {
          case 'student':
            return <StudentProfile />;
          case 'professor':
            return <ProfessorProfile />;
          default:
            return null;
        }
      case 'home':
        if (user) {
          return getDashboardByRole();
        }
        return (
          <>
            <Hero onNavigate={setPage} />
            <Features />
            <AIInsights />
            <Testimonials />
            <Footer onNavigate={setPage} />
          </>
        );
      default:
        // Redirect to home
        setPage('home');
        return null;
    }
  };

  return (
    <div className="min-h-screen relative">
      <Navigation onNavigate={setPage} />
      {renderPage()}
    </div>
  );
}