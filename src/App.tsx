import React, { useState } from 'react';
import { Heart, Menu, X, User, Calendar, FileText, Stethoscope, Pill, LogOut } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { AuthModal } from './components/AuthModal';
import { VoiceIntakeForm } from './components/VoiceIntakeForm';
import { AppointmentScheduler } from './components/AppointmentScheduler';
import MedicationCoach from './components/MedicationCoach';
import DoctorsDashboard from './components/DoctorsDashboard';
import FloatingChatWidget from './components/FloatingChatWidget';

type Page = 'home' | 'intake' | 'appointments' | 'medications' | 'doctors';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, loading, authError, signOut, retryConnection } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading HealthVoice...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4">
            <X className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{authError}</p>
          <button
            onClick={retryConnection}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const navigation = [
    { id: 'home', label: 'Home', icon: Heart },
    { id: 'intake', label: 'Intake Form', icon: FileText },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'medications', label: 'Medications', icon: Pill },
    ...(profile?.role === 'doctor' ? [{ id: 'doctors', label: 'Dashboard', icon: Stethoscope }] : []),
  ] as const;

  const handleSignOut = async () => {
    try {
      await signOut();
      setCurrentPage('home');
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'intake':
        return <VoiceIntakeForm />;
      case 'appointments':
        return <AppointmentScheduler />;
      case 'medications':
        return <MedicationCoach />;
      case 'doctors':
        return profile?.role === 'doctor' ? <DoctorsDashboard /> : <HomePage />;
      default:
        return <HomePage />;
    }
  };

  const HomePage = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Welcome to <span className="text-blue-600">HealthVoice</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Your intelligent healthcare companion powered by voice technology. 
          Get personalized health guidance, manage medications, and connect with healthcare providers.
        </p>
        {!user && (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            Get Started Today
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        <FeatureCard
          icon={<FileText className="w-8 h-8" />}
          title="Voice Intake Forms"
          description="Complete medical forms using voice input for a seamless experience"
          onClick={() => setCurrentPage('intake')}
        />
        <FeatureCard
          icon={<Calendar className="w-8 h-8" />}
          title="Smart Scheduling"
          description="Book appointments with healthcare providers effortlessly"
          onClick={() => setCurrentPage('appointments')}
        />
        <FeatureCard
          icon={<Pill className="w-8 h-8" />}
          title="Medication Coach"
          description="Track medications and get personalized reminders"
          onClick={() => setCurrentPage('medications')}
        />
        <FeatureCard
          icon={<Stethoscope className="w-8 h-8" />}
          title="Provider Network"
          description="Connect with qualified healthcare professionals"
          onClick={() => setCurrentPage('appointments')}
        />
        <FeatureCard
          icon={<Heart className="w-8 h-8" />}
          title="Health Insights"
          description="Get personalized health recommendations and insights"
          onClick={() => {}}
        />
        <FeatureCard
          icon={<User className="w-8 h-8" />}
          title="Personal Health Record"
          description="Maintain your complete health history in one place"
          onClick={() => setCurrentPage('intake')}
        />
      </div>
    </div>
  );

  const FeatureCard = ({ 
    icon, 
    title, 
    description, 
    onClick 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    description: string; 
    onClick: () => void;
  }) => (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-200"
    >
      <div className="text-blue-600 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setCurrentPage('home')}
                className="flex items-center space-x-2 text-xl font-bold text-blue-600"
              >
                <Heart className="w-8 h-8" />
                <span className="hidden sm:block">HealthVoice</span>
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id as Page)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:block text-sm">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block">Sign In</span>
                </button>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPage(item.id as Page);
                      closeMobileMenu();
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {renderPage()}
      </main>

      {/* Floating Chat Widget */}
      <FloatingChatWidget />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default App;