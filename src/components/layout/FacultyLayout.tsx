import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FacultySidebar } from './FacultySidebar';
import { FacultyTopBar } from './FacultyTopBar';

export function FacultyLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Faculty Navigation Sidebar */}
      <FacultySidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Faculty Top Navigation Bar */}
        <FacultyTopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Professional Footer */}
        <footer className="h-10 bg-white border-t border-slate-100 flex items-center justify-between px-6 text-xs text-slate-400 flex-shrink-0">
          <p>© 2026 UniVerse Academic Systems · Karunya Institute of Technology and Sciences</p>
          <p className="font-medium text-slate-500">Faculty & Academic Teaching Portal</p>
        </footer>
      </div>
    </div>
  );
}
