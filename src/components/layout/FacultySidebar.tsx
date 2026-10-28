import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, BookOpen, Award, CheckSquare,
  FileText, Calendar, DollarSign, LogOut, UserCheck, X,
  ChevronRight, Sparkles, Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

interface FacultySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/faculty/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'My Profile', path: '/faculty/profile', icon: <User size={18} /> },
  { label: 'Assigned Courses', path: '/faculty/courses', icon: <BookOpen size={18} /> },
  { label: 'Mark Attendance', path: '/faculty/attendance', icon: <UserCheck size={18} /> },
  { label: 'Student Performance', path: '/faculty/performance', icon: <Award size={18} /> },
  { label: 'Task Assignments', path: '/faculty/tasks', icon: <CheckSquare size={18} /> },
  { label: 'Salary & Payroll', path: '/faculty/salary', icon: <DollarSign size={18} /> },
  { label: 'Syllabus & Resources', path: '/faculty/resources', icon: <Layers size={18} /> },
];

export function FacultySidebar({ isOpen, onClose }: FacultySidebarProps) {
  const { faculty, logoutFaculty } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutFaculty();
    navigate('/faculty/login', { replace: true });
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
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="font-bold text-sm tracking-tight text-white leading-none">UniVerse</p>
              <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase mt-1">Faculty Portal</p>
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
              end={item.path === '/faculty/dashboard'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition duration-150 group',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <span className={cn('transition-colors', isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400')}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight size={14} className="text-indigo-200" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Faculty Profile & Logout Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex-shrink-0">
          {faculty && (
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
                  {faculty.full_name?.charAt(0) || 'F'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{faculty.full_name}</p>
                  <p className="text-[10px] text-indigo-300 font-medium truncate">{faculty.designation}</p>
                  <p className="text-[9px] text-slate-400 truncate">{faculty.department}</p>
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
