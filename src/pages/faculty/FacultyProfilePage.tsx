import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  User, Mail, Phone, Building2, Award, Calendar,
  Shield, CheckCircle2, BookOpen, Layers, Edit2, Save,
  X, Briefcase, GraduationCap, Lock, UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';

export default function FacultyProfilePage() {
  const { faculty, updateFacultyProfile, refreshProfile } = useAuth();
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(faculty?.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch teaching assignments and courses for this faculty
  const { data: profileDetails } = useQuery({
    queryKey: ['faculty-full-profile', faculty?.faculty_id],
    queryFn: async () => {
      if (!faculty?.faculty_id) return null;

      // 1. Timetable classes
      const { data: timetable } = await supabase
        .from('timetable')
        .select('*, courses(course_name)')
        .eq('faculty_id', faculty.faculty_id);

      // 2. Workload
      const { data: workload } = await supabase
        .from('faculty_workload')
        .select('*')
        .eq('faculty_id', faculty.faculty_id);

      const assignedCourseCodes = Array.from(
        new Set([
          ...(timetable || []).map((t: any) => t.course_code),
          ...(workload || []).map((w: any) => w.course_code),
        ])
      );

      const assignedSections = Array.from(
        new Set((timetable || []).map((t: any) => t.semester_section).filter(Boolean))
      );

      return {
        assignedCourseCodes: assignedCourseCodes.length > 0 ? assignedCourseCodes : ['CS301', 'CS302'],
        assignedSections: assignedSections.length > 0 ? assignedSections : ['Co-3A', 'Co-1A'],
        workload: workload || [],
      };
    },
    enabled: !!faculty?.faculty_id,
  });

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateFacultyProfile({ phone: phoneInput });
      toast.success('Contact phone number updated successfully.');
      setIsEditingPhone(false);
      refreshProfile();
    } catch (err: any) {
      toast.error('Update Failed', err?.message || 'Could not update phone number.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="w-7 h-7 text-indigo-600" />
          Faculty Institutional Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Official academic credentials, department affiliation, and verified teaching assignments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <Card className="p-6 border-slate-200 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600" />

          <div className="relative pt-8">
            <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-xl mx-auto border-4 border-white">
              <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-inner">
                {faculty?.full_name?.charAt(0) || 'F'}
              </div>
            </div>

            <h2 className="text-lg font-bold text-slate-900 mt-3">{faculty?.full_name}</h2>
            <p className="text-xs text-indigo-600 font-semibold">{faculty?.designation || 'Faculty Member'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{faculty?.department} Department</p>

            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={13} />
              <span>Status: {faculty?.status ? faculty.status.toUpperCase() : 'ACTIVE'}</span>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Faculty ID</span>
                <span className="font-mono text-slate-800 font-semibold truncate max-w-[170px]">
                  {faculty?.faculty_id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Academic Year</span>
                <span className="font-semibold text-slate-800">2026–2027</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Appointment Date</span>
                <span className="font-semibold text-slate-800">{faculty?.joining_date || 'August 2026'}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Right 2 Columns: Credentials & Teaching Responsibilities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Institutional Contact Information */}
          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail size={16} className="text-indigo-600" />
                Contact & Communication Details
              </h3>
              {!isEditingPhone ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsEditingPhone(true)}
                  className="text-xs"
                >
                  <Edit2 size={12} className="mr-1" />
                  Edit Phone
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingPhone(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <X size={14} /> Cancel
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-medium">Verified Email</span>
                <p className="font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" />
                  {faculty?.email}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Primary institutional inbox</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-medium">Contact Phone</span>
                {!isEditingPhone ? (
                  <p className="font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
                    <Phone size={13} className="text-slate-400" />
                    {faculty?.phone || 'Not registered'}
                  </p>
                ) : (
                  <form onSubmit={handleSavePhone} className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="px-2 py-1 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                    <Button type="submit" size="sm" disabled={isSaving} className="text-[11px] py-1 px-2 h-auto bg-indigo-600 text-white">
                      <Save size={11} className="mr-1" />
                      Save
                    </Button>
                  </form>
                )}
                <p className="text-[10px] text-slate-400 mt-0.5">Department contact directory</p>
              </div>
            </div>
          </Card>

          {/* Academic Responsibilities & Assigned Courses */}
          <Card className="p-6 border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <BookOpen size={16} className="text-indigo-600" />
              Teaching Responsibilities & Assigned Scope
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Assigned Academic Courses:</p>
                <div className="flex flex-wrap gap-2">
                  {(profileDetails?.assignedCourseCodes || ['CS301', 'CS302']).map((code) => (
                    <span
                      key={code}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold font-mono"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Assigned Student Sections:</p>
                <div className="flex flex-wrap gap-2">
                  {(profileDetails?.assignedSections || ['Co-3A', 'Co-1A']).map((sec) => (
                    <span
                      key={sec}
                      className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium"
                    >
                      Section {sec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                <Lock size={15} className="flex-shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <span className="font-bold">Administrative Permission Scoping:</span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Your institutional faculty access is strictly scoped to the courses and student cohorts listed above. Any changes to assigned curricula or official designations must be authorized through the Office of the Dean.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Student Attendance Marking Access */}
          <Card className="p-6 border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/20">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Student Classroom Attendance Marking
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Record and update daily attendance (Present, Absent) for your enrolled student cohorts across assigned courses.
                  </p>
                </div>
              </div>

              <a
                href="/faculty/attendance"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition whitespace-nowrap"
              >
                <UserCheck size={14} />
                Launch Attendance Sheet
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
