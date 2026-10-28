import { useState } from 'react';
import {
  Settings,
  Bell,
  Shield,
  LogOut,
  Info,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function StudentSettingsPage() {
  const { student, logout } = useAuth();
  const [attendanceAlerts, setAttendanceAlerts] = useState(true);
  const [examReminders, setExamReminders] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-indigo-600" />
          Portal Settings & Preferences
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure notifications, review identity isolation, and manage your student session.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-medium text-emerald-800">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Preferences updated successfully.
        </div>
      )}

      {/* Account Identity Card */}
      <Card className="p-6 border-slate-200">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-indigo-600" />
          Verified Student Identity
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Student Full Name</span>
            <span className="text-slate-900 font-semibold">{student?.full_name || 'N/A'}</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Register Number</span>
            <span className="text-indigo-600 font-mono font-bold">{student?.register_number || 'N/A'}</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Assigned Department</span>
            <span className="text-slate-800 font-medium">{student?.department || 'Department'}</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Institutional Email</span>
            <span className="text-slate-800 font-medium">{student?.email || 'N/A'}</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p>
            Official institutional attributes (Register Number, Department, Batch, Semester) are cryptographically bound to your student record. To modify official university information, contact the Registrar Office.
          </p>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6 border-slate-200">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-indigo-600" />
          Notification & Alert Preferences
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">Attendance Shortage Warnings</h4>
              <p className="text-[11px] text-slate-500">
                Display alert banner when overall attendance drops below 75%.
              </p>
            </div>
            <input
              type="checkbox"
              checked={attendanceAlerts}
              onChange={(e) => setAttendanceAlerts(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">Examination Result Announcements</h4>
              <p className="text-[11px] text-slate-500">
                Flag newly published examination transcripts on dashboard.
              </p>
            </div>
            <input
              type="checkbox"
              checked={examReminders}
              onChange={(e) => setExamReminders(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">AI Study Recommendations</h4>
              <p className="text-[11px] text-slate-500">
                Enable automatic syllabus topic recommendations for weaker courses.
              </p>
            </div>
            <input
              type="checkbox"
              checked={aiSuggestions}
              onChange={(e) => setAiSuggestions(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={handleSave} size="sm" className="text-xs">
            Save Preferences
          </Button>
        </div>
      </Card>

      {/* Session Management */}
      <Card className="p-6 border-slate-200">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-2 text-rose-600">
          <LogOut className="w-5 h-5 text-rose-600" />
          Active Portal Session
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Terminate your authenticated student session on this workstation.
        </p>
        <Button
          variant="secondary"
          onClick={logout}
          className="text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Log Out of UniVerse Portal
        </Button>
      </Card>
    </div>
  );
}
