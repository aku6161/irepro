import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ApplicationForm } from './components/ApplicationForm';
import { SuccessPage } from './components/SuccessPage';
import { UserGuide } from './components/UserGuide';
import { ContactUs } from './components/ContactUs';
import { UserLoginModal } from './components/UserLoginModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { ToastContainer } from './components/ToastContainer';
import { ApplicationRecord } from './types';

export function App() {
  const { 
    activeView, 
    setActiveView, 
    userRole, 
    previewDoc, 
    setPreviewDoc,
    editingApplication,
    setEditingApplication
  } = useApp();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserLoginOpen, setIsUserLoginOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [recentlyCreatedApp, setRecentlyCreatedApp] = useState<ApplicationRecord | null>(null);

  const handleApplicationCompleted = (createdApp: ApplicationRecord) => {
    setRecentlyCreatedApp(createdApp);
    setActiveView('success_result');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-red-600 selection:text-white font-sans text-slate-900">
      {/* Top Navigation Bar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenUserLogin={() => setIsUserLoginOpen(true)}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar (shown when logged in or navigated) */}
        {activeView !== 'landing' && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onOpenUserLogin={() => setIsUserLoginOpen(true)}
            onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          />
        )}

        {/* Content View Switcher */}
        <main className="flex-1 overflow-y-auto w-full">
          {activeView === 'landing' && (
            <LandingPage
              onOpenUserLogin={() => setIsUserLoginOpen(true)}
              onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
            />
          )}

          {(activeView === 'user_dashboard' || activeView === 'my_applications') && (
            userRole ? (
              <UserDashboard />
            ) : (
              <LandingPage
                onOpenUserLogin={() => setIsUserLoginOpen(true)}
                onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
              />
            )
          )}

          {(activeView === 'admin_dashboard' || activeView === 'admin_all_applications' || activeView === 'admin_statistics') && (
            <AdminDashboard />
          )}

          {activeView === 'new_application' && (
            <ApplicationForm
              editMode={false}
              onComplete={handleApplicationCompleted}
            />
          )}

          {activeView === 'edit_application' && (
            <ApplicationForm
              editMode={true}
              onComplete={handleApplicationCompleted}
            />
          )}

          {activeView === 'success_result' && (
            <SuccessPage
              application={recentlyCreatedApp || editingApplication}
              onViewDashboard={() => setActiveView(userRole === 'admin' ? 'admin_dashboard' : 'user_dashboard')}
              onNewApplication={() => {
                setEditingApplication(null);
                setActiveView('new_application');
              }}
            />
          )}

          {activeView === 'panduan' && <UserGuide />}

          {activeView === 'hubungi' && <ContactUs />}
        </main>
      </div>

      {/* Global Modals and Notification Toasts */}
      <UserLoginModal
        isOpen={isUserLoginOpen}
        onClose={() => setIsUserLoginOpen(false)}
      />

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
      />

      <DocumentViewerModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      <ToastContainer />
    </div>
  );
}

export default App;
