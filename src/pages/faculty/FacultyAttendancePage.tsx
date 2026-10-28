import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck, Calendar, Clock, BookOpen, Check, X,
  AlertCircle, Users, CheckCircle2, Save, RefreshCw,
  Search, Filter, ChevronRight, Layers, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { formatDate } from '../../lib/utils';

interface EnrolledStudent {
  student_id: string;
  full_name: string;
  register_number: string;
  department: string;
  status: 'Present' | 'Absent';
}

export default function FacultyAttendancePage() {
  const { faculty } = useAuth();
  const qc = useQueryClient();

  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [session, setSession] = useState<'Morning' | 'Afternoon'>('Morning');
  const [studentStates, setStudentStates] = useState<Record<string, 'Present' | 'Absent'>>({});
  const [searchFilter, setSearchFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch assigned courses for this faculty
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['faculty-assigned-courses-attendance', faculty?.faculty_id],
    queryFn: async () => {
      if (!faculty?.faculty_id) return [];

      const [ttRes, wlRes] = await Promise.all([
        supabase.from('timetable').select('course_code, courses(course_name)').eq('faculty_id', faculty.faculty_id),
        supabase.from('faculty_workload').select('course_code').eq('faculty_id', faculty.faculty_id),
      ]);

      const courseCodeSet = new Set<string>();
      (ttRes.data || []).forEach((t: any) => t.course_code && courseCodeSet.add(t.course_code));
      (wlRes.data || []).forEach((w: any) => w.course_code && courseCodeSet.add(w.course_code));

      let codes = Array.from(courseCodeSet);
      if (codes.length === 0) {
        // Fallback to department courses if workload not populated
        const { data: deptCourses } = await supabase
          .from('courses')
          .select('course_code, course_name')
          .eq('department_id', faculty.department_id || '')
          .limit(4);
        return (deptCourses || []).map((c: any) => ({
          course_code: c.course_code,
          course_name: c.course_name,
        }));
      }

      const { data: courseDetails } = await supabase
        .from('courses')
        .select('course_code, course_name')
        .in('course_code', codes);

      return courseDetails || [];
    },
    enabled: !!faculty?.faculty_id,
  });

  // Select first course by default when loaded
  useEffect(() => {
    if (courses.length > 0 && !selectedCourse) {
      setSelectedCourse(courses[0].course_code);
    }
  }, [courses, selectedCourse]);

  // 2. Fetch enrolled students for selected course
  const {
    data: enrolledStudents = [],
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ['course-enrolled-students', selectedCourse],
    queryFn: async () => {
      if (!selectedCourse) return [];

      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select('student_id, students(student_id, full_name, register_number, department)')
        .eq('course_code', selectedCourse)
        .order('student_id');

      if (error || !enrollments) return [];

      const list: Array<{
        student_id: string;
        full_name: string;
        register_number: string;
        department: string;
      }> = [];

      enrollments.forEach((e: any) => {
        if (e.students) {
          list.push({
            student_id: e.students.student_id,
            full_name: e.students.full_name,
            register_number: e.students.register_number,
            department: e.students.department,
          });
        }
      });

      return list;
    },
    enabled: !!selectedCourse,
  });

  // 3. Fetch any existing attendance records for (course, date, session)
  const { data: existingAttendance = [] } = useQuery({
    queryKey: ['existing-attendance-check', selectedCourse, attendanceDate, session],
    queryFn: async () => {
      if (!selectedCourse || !attendanceDate) return [];

      const { data, error } = await supabase
        .from('attendance')
        .select('attendance_id, student_id, status')
        .eq('course_code', selectedCourse)
        .eq('attendance_date', attendanceDate)
        .eq('session', session);

      if (error) return [];
      return data || [];
    },
    enabled: !!selectedCourse && !!attendanceDate,
  });

  // Initialize or update student statuses
  useEffect(() => {
    const newStates: Record<string, 'Present' | 'Absent'> = {};
    const existingMap = new Map<string, 'Present' | 'Absent'>();
    existingAttendance.forEach((a: any) => {
      if (a.student_id && a.status) {
        existingMap.set(a.student_id, a.status === 'Absent' ? 'Absent' : 'Present');
      }
    });

    enrolledStudents.forEach((st) => {
      if (existingMap.has(st.student_id)) {
        newStates[st.student_id] = existingMap.get(st.student_id)!;
      } else {
        newStates[st.student_id] = 'Present'; // Default to present
      }
    });

    setStudentStates(newStates);
  }, [enrolledStudents, existingAttendance]);

  // Bulk actions
  const markAll = (status: 'Present' | 'Absent') => {
    const updated: Record<string, 'Present' | 'Absent'> = {};
    enrolledStudents.forEach((st) => {
      updated[st.student_id] = status;
    });
    setStudentStates(updated);
  };

  const toggleStatus = (studentId: string, status: 'Present' | 'Absent') => {
    setStudentStates((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Submit attendance records to Supabase
  const handleSaveAttendance = async () => {
    if (!selectedCourse) {
      toast.error('Missing Course', 'Please select a course to record attendance.');
      return;
    }

    if (enrolledStudents.length === 0) {
      toast.error('No Students', 'No students enrolled in this course.');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeCourseObj = courses.find((c) => c.course_code === selectedCourse);
      const courseName = activeCourseObj?.course_name || selectedCourse;

      // 1. Delete existing records for this (course_code, attendance_date, session) to prevent duplicate rows
      await supabase
        .from('attendance')
        .delete()
        .eq('course_code', selectedCourse)
        .eq('attendance_date', attendanceDate)
        .eq('session', session);

      // 2. Insert fresh records
      const newRecords = enrolledStudents.map((st) => ({
        student_id: st.student_id,
        course_code: selectedCourse,
        course_name: courseName,
        attendance_date: attendanceDate,
        session: session,
        status: studentStates[st.student_id] || 'Present',
        marked_by: faculty?.full_name || 'Faculty Instructor',
        department_id: faculty?.department_id || null,
      }));

      // Insert in chunks of 200
      for (let i = 0; i < newRecords.length; i += 200) {
        const chunk = newRecords.slice(i, i + 200);
        const { error } = await supabase.from('attendance').insert(chunk);
        if (error) throw error;
      }

      qc.invalidateQueries({ queryKey: ['existing-attendance-check'] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(
        'Attendance Recorded',
        `Successfully marked attendance for ${newRecords.length} students in ${selectedCourse}.`
      );
    } catch (err: any) {
      toast.error('Submission Failed', err.message || 'Could not record attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats
  const totalStudents = enrolledStudents.length;
  const presentCount = Object.values(studentStates).filter((s) => s === 'Present').length;
  const absentCount = Object.values(studentStates).filter((s) => s === 'Absent').length;
  const presentPct = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  // Filtered students for display
  const filteredStudents = enrolledStudents.filter((st) => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    return (
      st.full_name.toLowerCase().includes(term) ||
      st.register_number.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <UserCheck className="w-7 h-7 text-indigo-600" />
              Student Attendance Marking
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Classroom Roster
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Mark daily lecture & practical attendance for students enrolled in your assigned courses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveAttendance}
            isLoading={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
            icon={<Save size={16} />}
          >
            Submit Attendance
          </Button>
        </div>
      </div>

      {/* Control Bar: Course, Date, Session Pickers */}
      <Card className="p-5 border-slate-200 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Course Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Assigned Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              disabled={coursesLoading}
              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {courses.map((c) => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code} — {c.course_name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Attendance Date
            </label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 3. Session Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Session
            </label>
            <select
              value={session}
              onChange={(e) => setSession(e.target.value as 'Morning' | 'Afternoon')}
              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Morning">Morning (Lecture 09:00–12:30)</option>
              <option value="Afternoon">Afternoon (Practical/Lab 13:30–16:30)</option>
            </select>
          </div>
        </div>

        {/* Existing Record Indicator */}
        {existingAttendance.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-700">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-indigo-600" />
              Existing attendance record detected ({existingAttendance.length} students marked). Changes will overwrite this session.
            </span>
          </div>
        )}
      </Card>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Enrolled Students</span>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalStudents}</p>
        </div>

        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Present</span>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-black text-emerald-600 font-mono">{presentCount}</p>
            <span className="text-xs font-bold text-emerald-700">({presentPct}%)</span>
          </div>
        </div>

        <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 shadow-xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Absent</span>
          <p className="text-2xl font-black text-rose-600 mt-1 font-mono">{absentCount}</p>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <Card className="border-slate-200 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or register no..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56 sm:w-64"
              />
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredStudents.length} of {totalStudents} students
            </span>
          </div>

          {/* Quick Mark All Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => markAll('Present')}
              className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            >
              All Present
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => markAll('Absent')}
              className="text-xs bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
            >
              All Absent
            </Button>
          </div>
        </div>

        {/* Students List */}
        {studentsLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading enrolled students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No enrolled students found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white text-[11px] text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Student Details</th>
                  <th className="py-3 px-4">Register Number</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Current Status</th>
                  <th className="py-3 px-4 text-right">Quick Mark Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st, idx) => {
                  const currentStatus = studentStates[st.student_id] || 'Present';

                  return (
                    <tr key={st.student_id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{st.full_name}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                        {st.register_number}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {st.department}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            currentStatus === 'Present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {currentStatus}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                          <button
                            type="button"
                            onClick={() => toggleStatus(st.student_id, 'Present')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              currentStatus === 'Present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
                            }`}
                          >
                            Present (P)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStatus(st.student_id, 'Absent')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              currentStatus === 'Absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-white'
                            }`}
                          >
                            Absent (A)
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Submit Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Records will be synced to institutional database tables and integrated into student AI risk analytics.
          </p>
          <Button
            onClick={handleSaveAttendance}
            isLoading={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            icon={<Save size={16} />}
          >
            Submit Attendance
          </Button>
        </div>
      </Card>
    </div>
  );
}
