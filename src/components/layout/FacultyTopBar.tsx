import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, User, Sparkles, ChevronDown, UserCheck, BookOpen, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface FacultyTopBarProps {
  onMenuClick: () => void;
}

export function FacultyTopBar({ onMenuClick }: FacultyTopBarProps) {
  const { faculty, logoutFaculty } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    await logoutFaculty();
    navigate('/faculty/login', { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0 z-30">
      {/* Left: Mobile Toggle & Welcome Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              {faculty?.full_name ? `Welcome, ${faculty.full_name}` : 'Faculty Portal'}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <UserCheck size={11} className="text-indigo-600" />
              Verified Faculty Member
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            {faculty?.designation || 'Faculty Member'} · {faculty?.department || 'Academic Department'} · AY 2026–2027
          </p>
        </div>
      </div>

      {/* Right: Profile Avatar Menu */}
      <div className="flex items-center gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
            aria-label="Faculty account menu"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
              {faculty?.full_name?.charAt(0) || 'F'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{faculty?.full_name}</p>
              <p className="text-[10px] text-slate-400">{faculty?.designation || 'Faculty'}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {/* Account Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-scale-in">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{faculty?.full_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{faculty?.email}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-indigo-50 text-[10px] font-medium text-indigo-700">
                  {faculty?.department}
                </span>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/faculty/profile');
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <User size={14} className="text-slate-400" />
                <span>My Faculty Profile</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/faculty/courses');
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <BookOpen size={14} className="text-slate-400" />
                <span>Assigned Courses</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/faculty/resources');
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Layers size={14} className="text-slate-400" />
                <span>Syllabus & Resources</span>
              </button>

              <div className="border-t border-slate-100 my-1" />

              <button
                onClick={handleLogout}
                className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
