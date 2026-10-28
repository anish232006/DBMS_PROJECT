import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  UserCheck, Eye, EyeOff, Lock, Mail, ArrowRight,
  AlertCircle, Sparkles, CheckCircle2, ArrowLeft, KeyRound,
  BookOpen, ShieldCheck, HelpCircle, X
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

// Verified faculty members from Supabase institutional database
const QUICK_TEST_FACULTY = [
  {
    name: 'Dr. Ramesh Kumar',
    email: 'ramesh.kumar@university.edu',
    dept: 'Computer Science',
    designation: 'Associate Professor',
    courses: 'CS301 (DBMS), CS302 (OS), CO301 (Data Structures)'
  },
  {
    name: 'Dr. Anitha Menon',
    email: 'anitha.menon@university.edu',
    dept: 'Computer Science',
    designation: 'Assistant Professor',
    courses: 'CS301 (DBMS), CO302 (Algorithms)'
  },
  {
    name: 'Dr. Sarah Mitchell',
    email: 'sarah.mitchell@university.edu',
    dept: 'Computer Science',
    designation: 'Department Head & Professor',
    courses: 'Advanced Systems, AI Foundations'
  },
  {
    name: 'Dr. K. Vijayakumar',
    email: 'vijayakumar@university.edu',
    dept: 'Electronics',
    designation: 'Professor',
    courses: 'EC301 (Digital Signal Processing)'
  }
];

export default function FacultyLoginPage() {
  const { loginFaculty, resetPassword, isFacultyAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('ramesh.kumar@university.edu');
  const [password, setPassword] = useState('faculty123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isFacultyAuthenticated) {
      const dest = (location.state as any)?.from?.pathname || '/faculty/dashboard';
      navigate(dest, { replace: true });
    }
  }, [isFacultyAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMsg(null);
    setIsLoading(true);

    try {
      if (!email.trim()) {
        setError('Please enter your institutional faculty email.');
        setIsLoading(false);
        return;
      }
      await loginFaculty(email, password);
      const dest = (location.state as any)?.from?.pathname || '/faculty/dashboard';
      navigate(dest, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Faculty authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSubmitting(true);
    setResetFeedback(null);

    const res = await resetPassword(resetEmail || email);
    setResetSubmitting(false);
    setResetFeedback(res.message);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-2 border-b border-slate-800/80">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft size={14} />
          <span>Return to University Gateway</span>
        </Link>

        <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5 font-medium">
          <UserCheck size={13} className="text-indigo-400" />
          Faculty & Academic Portal
        </span>
      </header>

      {/* Main Card */}
      <main className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
          {/* Header Banner */}
          <div className="p-7 text-white bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-inner flex-shrink-0">
                <UserCheck size={26} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Faculty Portal Sign In
                </h2>
                <p className="text-xs text-white/80 mt-0.5">
                  Academic teaching, syllabus topics & student performance
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

            {statusMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
                <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
                <span>{statusMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Faculty Institutional Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ramesh.kumar@university.edu"
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-semibold"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Use your verified university department email address
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setShowResetModal(true);
                      setResetFeedback(null);
                    }}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 text-xs font-bold justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
              >
                {isLoading ? (
                  'Verifying Credentials...'
                ) : (
                  <>
                    <span>Sign In to Faculty Portal</span>
                    <ArrowRight size={14} className="ml-1" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Test Faculty Accounts */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-600 mb-2.5 flex items-center justify-between">
                <span>⚡ Verified Faculty Accounts</span>
                <span className="text-[10px] font-normal text-slate-400">Click to autofill</span>
              </p>

              <div className="grid grid-cols-1 gap-2">
                {QUICK_TEST_FACULTY.map((fac) => (
                  <button
                    key={fac.email}
                    type="button"
                    onClick={() => {
                      setEmail(fac.email);
                      setPassword('faculty123');
                      setError(null);
                    }}
                    className="p-2.5 text-left rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/60 transition group flex items-start justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                        {fac.name}
                      </p>
                      <p className="text-[10px] text-slate-500">{fac.designation} · {fac.dept}</p>
                      <p className="text-[9px] text-indigo-600/80 mt-0.5 font-medium">{fac.courses}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Use
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>🎓 Student portal login:</span>
            <Link to="/student/login" className="text-blue-600 hover:underline font-semibold">
              Go to Student Portal
            </Link>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600">
                <KeyRound size={18} />
                <h3 className="font-bold text-sm text-slate-900">Faculty Password Recovery</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Enter your institutional faculty email address. A password recovery instruction will be processed via Supabase Auth.
            </p>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  University Email
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="faculty@university.edu"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {resetFeedback && (
                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-700">
                  {resetFeedback}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowResetModal(false)}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={resetSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {resetSubmitting ? 'Sending...' : 'Send Recovery Link'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center py-2 text-xs text-slate-500">
        UniVerse Faculty & Academic Management System · Karunya Institute of Technology and Sciences
      </footer>
    </div>
  );
}
