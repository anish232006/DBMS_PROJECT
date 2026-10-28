import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { StudentSidebar } from './StudentSidebar';
import { StudentTopBar } from './StudentTopBar';
import { AiChatbot } from '../ai/AiChatbot';

export function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Student Navigation Sidebar */}
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Student Top Navigation Bar */}
        <StudentTopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Professional Footer */}
        <footer className="h-10 bg-white border-t border-slate-100 flex items-center justify-between px-6 text-xs text-slate-400 flex-shrink-0">
          <p>© 2026 UniVerse Academic Systems</p>
          <p className="font-medium text-slate-500">Student Portal · AI-Powered Learning</p>
        </footer>
      </div>

      {/* Floating Personalized Student AI Assistant */}
      <AiChatbot />
    </div>
  );
}
