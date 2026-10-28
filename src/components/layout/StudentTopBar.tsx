import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, User, Sparkles, ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface StudentTopBarProps {
  onMenuClick: () => void;
}

export function StudentTopBar({ onMenuClick }: StudentTopBarProps) {
  const { student, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    await logout();
    navigate('/login', { replace: true });
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
              Welcome, {student?.full_name || 'Student'}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              <Sparkles size={10} className="text-blue-500" />
              Verified Student
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            {student?.department} · Semester {student?.current_semester} · Reg: {student?.register_number}
          </p>
        </div>
      </div>

      {/* Right: Profile Avatar Menu */}
      <div className="flex items-center gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
            aria-label="Account menu"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
              {student?.full_name?.charAt(0) || 'S'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{student?.full_name}</p>
              <p className="text-[10px] text-slate-400 font-mono">{student?.register_number}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {/* Account Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-scale-in">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{student?.full_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{student?.email}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-600">
                  {student?.register_number}
                </span>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/student/profile');
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <User size={14} className="text-slate-400" />
                <span>My Profile</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                onClick={handleLogout}
                className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
