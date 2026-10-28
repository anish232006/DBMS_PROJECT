import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, Award, CheckSquare, FileText,
  Calendar, Brain, BookOpen, Settings, LogOut,
  GraduationCap, X, ChevronRight, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

interface StudentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'My Profile', path: '/student/profile', icon: <User size={18} /> },
  { label: 'Academic Performance', path: '/student/academic-performance', icon: <Award size={18} /> },
  { label: 'Attendance', path: '/student/attendance', icon: <CheckSquare size={18} /> },
  { label: 'Examination Results', path: '/student/examination-results', icon: <FileText size={18} /> },
  { label: 'My Timetable', path: '/student/timetable', icon: <Calendar size={18} /> },
  { label: 'Assignments & Tasks', path: '/student/tasks', icon: <ClipboardList size={18} /> },
  { label: 'AI Study Assistant', path: '/student/study-assistant', icon: <Brain size={18} /> },
  { label: 'Study Resources', path: '/student/study-resources', icon: <BookOpen size={18} /> },
  { label: 'Settings', path: '/student/settings', icon: <Settings size={18} /> },
];

export function StudentSidebar({ isOpen, onClose }: StudentSidebarProps) {
  const { student, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 border-r border-slate-800 shadow-xl lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="font-bold text-sm tracking-tight text-white leading-none">UniVerse</p>
              <p className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase mt-1">Student Portal</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/student/dashboard'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition duration-150 group',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <span className={cn('transition-colors', isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400')}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight size={14} className="text-blue-200" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Student Profile & Logout Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex-shrink-0">
          {student && (
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
                  {student.full_name?.charAt(0) || 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{student.full_name}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{student.register_number}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
