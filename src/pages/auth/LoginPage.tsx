import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap, Eye, EyeOff, Lock, User, ArrowRight,
  AlertCircle, ShieldCheck, Sparkles, CheckCircle2, Shield,
  ArrowLeft, Building2, BookOpen, Award, CheckSquare, UserCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

// Verified students in the database for 1-click testing
const QUICK_TEST_STUDENTS = [
  { name: 'Mohammed Anish R', regNo: 'URK24CS1092', dept: 'Computer Science', sem: 5, note: 'CS Core Student' },
  { name: 'Marcus Chen', regNo: 'URK22EE6041', dept: 'Electrical & Electronics', sem: 7, note: 'Senior honors student' },
  { name: 'Aarav Sharma', regNo: 'URK23CS3164', dept: 'Computer Science', sem: 5, note: 'Regular CS curriculum' },
  { name: 'Amara Pillai', regNo: 'URK23BA5147', dept: 'Business Admin', sem: 6, note: 'Management student' },
];

// Verified administrators for 1-click testing
const QUICK_TEST_ADMINS = [
  {
    name: 'Super Admin',
    email: 'admin@universe.edu',
    dept: 'Institutional Management',
    role: 'University Super Administrator',
  },
  {
    name: 'Dr. Sarah Mitchell',
    email: 'dean@universe.edu',
    dept: 'Academic Affairs',
    role: 'Academic Dean & Chief Officer',
  },
  {
    name: 'David Vance',
    email: 'registrar@universe.edu',
    dept: 'Office of the Registrar',
    role: 'Institutional Registrar',
  },
];

interface LoginPageProps {
  defaultRole?: 'student' | 'admin' | 'choose';
}

export default function LoginPage({ defaultRole }: LoginPageProps) {
  const { loginStudent, loginAdmin, isStudentAuthenticated, isFacultyAuthenticated, isAdminAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role can be 'student', 'admin', or 'choose' (for the main opening gateway)
  const roleParam = searchParams.get('role');
  const initialRole: 'student' | 'admin' | 'choose' =
    roleParam === 'admin'
      ? 'admin'
      : roleParam === 'student'
      ? 'student'
      : defaultRole === 'admin'
      ? 'admin'
      : defaultRole === 'student'
      ? 'student'
      : 'choose';

  const [activePortal, setActivePortal] = useState<'student' | 'admin' | 'choose'>(initialRole);

  // Form states for Student
  const [studentId, setStudentId] = useState('URK24CS1092');
  const [studentPassword, setStudentPassword] = useState('password123');

  // Form states for Admin
  const [adminId, setAdminId] = useState('admin@universe.edu');
  const [adminPassword, setAdminPassword] = useState('admin123');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state if URL param changes
  useEffect(() => {
    if (roleParam === 'admin' && activePortal !== 'admin') {
      setActivePortal('admin');
    } else if (roleParam === 'student' && activePortal !== 'student') {
      setActivePortal('student');
    }
  }, [roleParam]);

  // If already authenticated, redirect to the corresponding portal
  useEffect(() => {
    if (isFacultyAuthenticated) {
      navigate('/faculty/dashboard', { replace: true });
    } else if (isStudentAuthenticated && activePortal !== 'admin') {
      const dest = (location.state as any)?.from?.pathname || '/student/dashboard';
      navigate(dest.startsWith('/management') ? '/student/dashboard' : dest, { replace: true });
    } else if (isAdminAuthenticated && activePortal !== 'student') {
      const dest = (location.state as any)?.from?.pathname || '/management';
      navigate(dest, { replace: true });
    }
  }, [isStudentAuthenticated, isFacultyAuthenticated, isAdminAuthenticated, activePortal, navigate, location]);

  const selectPortal = (portal: 'student' | 'admin') => {
    setActivePortal(portal);
    setError(null);
    setSearchParams({ role: portal });
  };

  const backToGateway = () => {
    setActivePortal('choose');
    setError(null);
    setSearchParams({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (activePortal === 'student') {
        if (!studentId.trim()) {
          setError('Please enter your Register Number or University Email.');
          setIsLoading(false);
          return;
        }
        await loginStudent(studentId, studentPassword);
        const dest = (location.state as any)?.from?.pathname || '/student/dashboard';
        navigate(dest.startsWith('/management') ? '/student/dashboard' : dest, { replace: true });
      } else {
        if (!adminId.trim()) {
          setError('Please enter your Administrator Email or Staff Username.');
          setIsLoading(false);
          return;
        }
        await loginAdmin(adminId, adminPassword);
        const dest = (location.state as any)?.from?.pathname || '/management';
        navigate(dest, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // VIEW 1: MAIN OPENING PAGE (GATEWAY - PORTAL SELECTION)
  // -------------------------------------------------------------
  if (activePortal === 'choose') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
        {/* Top University Brand Header */}
        <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-2 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight leading-tight">UniVerse</h1>
              <p className="text-[11px] text-blue-400 font-medium">Karunya Institute of Technology and Sciences</p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            University Portal Gateway
          </span>
        </header>

        {/* Central Selection Area */}
        <main className="max-w-5xl mx-auto w-full my-auto py-10">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
              <Sparkles size={13} />
              Secure Institutional Access
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Welcome to the University Portal
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Please choose your designated portal below to proceed. Student records and institutional administrative functions are maintained in strictly isolated environments.
            </p>
          </div>

          {/* Three Distinct Portal Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* PORTAL 1: STUDENT PORTAL */}
            <div
              onClick={() => selectPortal('student')}
              className="group relative bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/60 rounded-3xl p-6 sm:p-7 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-md">
                    <GraduationCap size={26} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    Students
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                  Student Portal
                </h3>
                <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                  Dedicated self-service terminal for enrolled students. View exam marks, course enrollments, attendance logs, and AI study resources.
                </p>

                <div className="mt-5 pt-4 border-t border-slate-700/60 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-blue-400 flex-shrink-0" />
                    <span>Personal marks & examination results</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-blue-400 flex-shrink-0" />
                    <span>Class attendance percentages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-blue-400 flex-shrink-0" />
                    <span>Syllabus-aware AI study materials & videos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-blue-400 flex-shrink-0" />
                    <span>Assigned student coursework & tasks</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3">
                <button
                  type="button"
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition group-hover:translate-x-0.5"
                >
                  <span>Enter Student Portal</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* PORTAL 2: FACULTY PORTAL */}
            <div
              onClick={() => navigate('/faculty/login')}
              className="group relative bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 rounded-3xl p-6 sm:p-7 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-md">
                    <UserCheck size={26} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    Faculty
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                  Faculty Portal
                </h3>
                <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                  Academic portal for teaching faculty. Manage assigned courses, syllabus topics, student performance, tasks & assignments, and personal salary.
                </p>

                <div className="mt-5 pt-4 border-t border-slate-700/60 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-indigo-400 flex-shrink-0" />
                    <span>Assigned courses, timetable & classes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-indigo-400 flex-shrink-0" />
                    <span>Course-level student performance & ML risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-indigo-400 flex-shrink-0" />
                    <span>Task assignments, grading & feedback</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-indigo-400 flex-shrink-0" />
                    <span>Authorized salary & personal payroll records</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3">
                <button
                  type="button"
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition group-hover:translate-x-0.5"
                >
                  <span>Enter Faculty Portal</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* PORTAL 3: ADMINISTRATOR PORTAL */}
            <div
              onClick={() => selectPortal('admin')}
              className="group relative bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/60 rounded-3xl p-6 sm:p-7 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-md">
                    <Shield size={26} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    Administration
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                  Administrator Portal
                </h3>
                <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                  Institutional executive control center for University Leadership, Deans, and the Registrar. Institutional analytics and full system records.
                </p>

                <div className="mt-5 pt-4 border-t border-slate-700/60 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-purple-400 flex-shrink-0" />
                    <span>University-wide academic oversight</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-purple-400 flex-shrink-0" />
                    <span>Institutional AI performance & XGBoost risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-purple-400 flex-shrink-0" />
                    <span>Admissions, curriculum & faculty management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-purple-400 flex-shrink-0" />
                    <span>Campus operations, finance & audit</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3">
                <button
                  type="button"
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition group-hover:translate-x-0.5"
                >
                  <span>Enter Administrator Portal</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto w-full text-center py-4 text-xs text-slate-500 border-t border-slate-800/80">
          © 2026 UniVerse University Management Systems · Karunya Institute of Technology and Sciences
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: DEDICATED LOGIN SCREEN (STUDENT OR ADMIN)
  // -------------------------------------------------------------
  const isStudent = activePortal === 'student';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Return to Gateway Button */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <button
          onClick={backToGateway}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft size={14} />
          <span>Change Portal Selection</span>
        </button>

        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
            isStudent
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
          }`}
        >
          {isStudent ? '🎓 Student Sign In' : '🛡️ Admin Sign In'}
        </span>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
        {/* Header Banner */}
        <div
          className={`p-6 text-white ${
            isStudent
              ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700'
              : 'bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-inner flex-shrink-0">
              {isStudent ? <GraduationCap size={26} /> : <Shield size={26} />}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {isStudent ? 'Student Portal Login' : 'Administrator Sign In'}
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                {isStudent
                  ? 'Access your personal academic records & AI tutor'
                  : 'Faculty & Administrative Management Console'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isStudent ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Register Number / Student ID
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. URK24CS1092"
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 font-semibold uppercase"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Format: URK24CS1092 or university student email
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Institutional Staff Email
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    placeholder="admin@universe.edu"
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 font-semibold"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Institutional administrator or faculty member email
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <span className="text-[10px] text-slate-400">Demo: password123 / admin123</span>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={isStudent ? studentPassword : adminPassword}
                  onChange={(e) =>
                    isStudent ? setStudentPassword(e.target.value) : setAdminPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 text-xs font-bold justify-center rounded-xl shadow-md ${
                isStudent
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                  : 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white shadow-purple-700/20'
              }`}
            >
              {isLoading ? (
                'Authenticating...'
              ) : isStudent ? (
                <>
                  <span>Sign In to Student Portal</span>
                  <ArrowRight size={14} className="ml-1" />
                </>
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight size={14} className="ml-1" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Test Accounts */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-600 mb-2.5 flex items-center justify-between">
              <span>⚡ Quick Demo Credentials</span>
              <span className="text-[10px] font-normal text-slate-400">Click to autofill</span>
            </p>

            <div className="grid grid-cols-2 gap-2">
              {isStudent
                ? QUICK_TEST_STUDENTS.map((st) => (
                    <button
                      key={st.regNo}
                      type="button"
                      onClick={() => {
                        setStudentId(st.regNo);
                        setStudentPassword('password123');
                        setError(null);
                      }}
                      className="p-2 text-left rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/60 transition group"
                    >
                      <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                        {st.name}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">{st.regNo}</p>
                    </button>
                  ))
                : QUICK_TEST_ADMINS.map((adm) => (
                    <button
                      key={adm.email}
                      type="button"
                      onClick={() => {
                        setAdminId(adm.email);
                        setAdminPassword('admin123');
                        setError(null);
                      }}
                      className="p-2 text-left rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/60 transition group"
                    >
                      <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700 truncate">
                        {adm.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{adm.dept}</p>
                    </button>
                  ))}
            </div>
          </div>
        </div>

        {/* Portal Notice */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {isStudent
              ? '🔒 Student portal is strictly isolated to your own records.'
              : '🛡️ Administrator portal provides complete university access.'}
          </span>
          <button
            onClick={() => selectPortal(isStudent ? 'admin' : 'student')}
            className="text-blue-600 hover:underline font-semibold ml-2 flex-shrink-0"
          >
            {isStudent ? 'Switch to Admin' : 'Switch to Student'}
          </button>
        </div>
      </div>
    </div>
  );
}
