import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, ArrowLeft, GraduationCap, Shield, LogOut, ChevronDown, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/students': 'Students',
  '/admissions': 'Admissions',
  '/departments': 'Departments',
  '/courses': 'Courses',
  '/faculty': 'Faculty',
  '/classrooms': 'Classrooms',
  '/enrollments': 'Enrollments',
  '/attendance': 'Attendance',
  '/examinations': 'Examinations',
  '/timetable': 'Timetable',
  '/faculty-workload': 'Faculty Workload',
  '/hostel-rooms': 'Hostel Rooms',
  '/hostel-allocations': 'Hostel Allocations',
  '/clubs': 'Clubs',
  '/club-memberships': 'Club Memberships',
  '/events': 'Events',
  '/event-participants': 'Event Participants',
  '/sports-teams': 'Sports Teams',
  '/sports-participation': 'Sports Participation',
  '/library-books': 'Library Books',
  '/library-transactions': 'Library Transactions',
  '/transport-routes': 'Transport Routes',
  '/transport-allocations': 'Transport Allocations',
  '/health-records': 'Health Records',
  '/visitor-logs': 'Visitor Logs',
  '/companies': 'Companies',
  '/placement-drives': 'Placement Drives',
  '/placement-applications': 'Placement Applications',
  '/research-projects': 'Research Projects',
  '/research-participants': 'Research Participants',
  '/alumni': 'Alumni',
  '/fee-structure': 'Fee Structure',
  '/finance': 'Finance',
  '/inventory': 'Inventory',
  '/grievances': 'Grievances',
  '/feedback': 'Feedback',
};

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { admin, logoutAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHome = location.pathname === '/management' || location.pathname === '/';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logoutAdmin();
    navigate('/login?role=admin', { replace: true });
  };

  const adminName = admin?.full_name || 'System Administrator';
  const adminRoleLabel =
    admin?.designation ||
    (admin?.role === 'super_admin'
      ? 'Chief Administrator'
      : admin?.role === 'dean'
      ? 'Academic Dean'
      : admin?.role === 'registrar'
      ? 'Registrar'
      : 'Faculty Administrator');

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-30 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        {/* Back button (only shown if not on home/dashboard) */}
        {!isHome && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center justify-center font-bold"
            title="Go back"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-800">
            <Shield size={12} className="text-indigo-600" />
            Institutional Management
          </span>
          {admin?.department && (
            <span className="text-xs text-slate-400">· {admin.department}</span>
          )}
        </div>
      </div>

      {/* Switch to Student Portal & Admin Account Avatar Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs"
          title="Switch to Student Portal"
        >
          <GraduationCap size={14} />
          <span className="hidden md:inline">Switch to</span>
          <span>Student Portal</span>
        </button>

        {/* Admin Account Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
            aria-label="Administrator profile menu"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-700 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
              {adminName.charAt(0) || 'A'}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[150px]">
                {adminName}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                {adminRoleLabel}
              </p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-scale-in">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield size={13} className="text-indigo-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {adminRoleLabel}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900">{adminName}</p>
                <p className="text-[11px] text-slate-500 truncate">{admin?.email || 'admin@universe.edu'}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/management/ai-analytics');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Sparkles size={13} className="text-purple-600" />
                  <span>AI Performance Analytics</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                >
                  <LogOut size={13} />
                  <span>Sign Out of Admin Portal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
