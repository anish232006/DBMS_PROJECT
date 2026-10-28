import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AiChatbot } from '../ai/AiChatbot';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
        <footer className="h-10 bg-white border-t border-slate-100 flex items-center justify-between px-6 text-xs text-slate-400 flex-shrink-0">
          <p>© 2026 PW Data Solutions</p>
          <p className="font-medium">Powered by EDU SERVE</p>
        </footer>
      </div>
      {/* Global Grounded AI University Assistant */}
      <AiChatbot />
    </div>
  );
}
