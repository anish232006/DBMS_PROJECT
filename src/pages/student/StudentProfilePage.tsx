import React, { useState } from 'react';
import {
  User, Mail, Phone, MapPin, Building,
  ShieldCheck, Save, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';

export default function StudentProfilePage() {
  const { student, updateProfile } = useAuth();

  const [phone, setPhone] = useState(student?.phone || '');
  const [address, setAddress] = useState(student?.address || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (student) {
      setPhone(student.phone || '');
      setAddress(student.address || '');
    }
  }, [student]);

  if (!student) {
    return (
      <div className="p-10 text-center bg-white rounded-2xl border border-slate-100 max-w-md mx-auto my-12 shadow-sm animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <User size={28} />
        </div>
        <h3 className="text-base font-bold text-slate-800">No Student Session Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
          This portal is reserved for registered students. Please sign in with your student credentials to access your academic records.
        </p>
        <Button onClick={() => (window.location.href = '/login?role=student')}>
          Sign In to Student Portal
        </Button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await updateProfile({ phone, address });
      toast.success('Profile Updated', 'Your contact information was successfully saved.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
      toast.error('Update Failed', err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-4xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Profile & Records</h1>
        <p className="text-xs text-slate-500 mt-1">
          Verified institutional enrollment records and personal contact information
        </p>
      </div>

      {/* Main Identity Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-6 text-white shadow-lg shadow-blue-900/10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl text-white shadow-inner flex-shrink-0">
            {student.full_name?.charAt(0) || 'S'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold truncate">{student.full_name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400 text-emerald-950 uppercase">
                {student.status}
              </span>
            </div>

            <p className="text-blue-100 text-xs mt-1 font-mono">
              Register No: {student.register_number}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2.5 py-1 rounded-lg bg-white/15 text-xs text-white backdrop-blur-sm">
                {student.department}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/15 text-xs text-white backdrop-blur-sm">
                Semester {student.current_semester}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/15 text-xs text-white backdrop-blur-sm">
                Batch {student.batch_year}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Official Academic Information (Read-Only) */}
        <Card>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Building size={18} className="text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Official Institutional Data</h2>
              <p className="text-[11px] text-slate-400">Maintained exclusively by the registrar</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Full Name</span>
              <span className="font-semibold text-slate-800">{student.full_name}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Register Number</span>
              <span className="font-mono font-semibold text-blue-700">{student.register_number}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Department</span>
              <span className="font-semibold text-slate-800">{student.department}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Current Semester</span>
              <span className="font-semibold text-slate-800">Semester {student.current_semester}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Batch Year</span>
              <span className="font-semibold text-slate-800">{student.batch_year}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-medium">Date of Birth</span>
              <span className="font-semibold text-slate-800">{student.date_of_birth || 'Not Recorded'}</span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 font-medium">Enrollment Status</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle2 size={13} /> Active & Enrolled
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-400">
            🔒 Academic details are locked to protect institutional record integrity. Contact the department office for corrections.
          </div>
        </Card>

        {/* Student-Editable Contact Information */}
        <Card>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <User size={18} className="text-purple-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Personal Contact Information</h2>
              <p className="text-[11px] text-slate-400">Update your verified address and telephone</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" />
                University Email Address (Official)
              </label>
              <input
                type="email"
                disabled
                value={student.email}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed text-xs font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Official communications are routed here.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone size={13} className="text-slate-400" />
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400" />
                Residential / Hostel Address
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Room / Block, Street, City, State, PIN"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs resize-none"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                isLoading={isSaving}
                icon={<Save size={14} />}
                className="w-full justify-center"
              >
                Save Contact Updates
              </Button>
            </div>
          </form>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span>Updates are persisted directly to Supabase</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
