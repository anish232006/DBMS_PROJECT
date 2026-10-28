import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  BookOpen,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface AttendanceRecord {
  attendance_id: string;
  student_id: string;
  course_code: string;
  course_name?: string | null;
  attendance_date: string;
  session?: string | null;
  status: 'Present' | 'Absent' | string;
  marked_by?: string | null;
  department_id?: string | null;
}

const ATTENDANCE_THRESHOLD = 75; // 75% standard university eligibility requirement

export default function StudentAttendancePage() {
  const { student } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const {
    data: records = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<AttendanceRecord[]>({
    queryKey: ['student-attendance-detailed', student?.student_id],
    queryFn: async () => {
      if (!student?.student_id) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', student.student_id)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      return (data || []) as AttendanceRecord[];
    },
    enabled: !!student?.student_id,
  });

  // Calculate overall metrics
  const totalSessions = records.length;
  const presentCount = records.filter(r => r.status?.toLowerCase() === 'present').length;
  const absentCount = records.filter(r => r.status?.toLowerCase() === 'absent').length;
  const overallPercentage = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;
  const isBelowThreshold = totalSessions > 0 && overallPercentage < ATTENDANCE_THRESHOLD;

  // Group by Course Code
  const subjectMap = new Map<string, { present: number; total: number; absent: number; name: string }>();
  for (const r of records) {
    const code = r.course_code || 'General';
    const name = r.course_name || code;
    const current = subjectMap.get(code) || { present: 0, total: 0, absent: 0, name };
    current.total += 1;
    if (r.status?.toLowerCase() === 'present') current.present += 1;
    if (r.status?.toLowerCase() === 'absent') current.absent += 1;
    subjectMap.set(code, current);
  }

  const subjectBreakdown = Array.from(subjectMap.entries()).map(([code, stats]) => ({
    courseCode: code,
    courseName: stats.name,
    present: stats.present,
    absent: stats.absent,
    total: stats.total,
    percentage: Math.round((stats.present / stats.total) * 100),
  })).sort((a, b) => a.percentage - b.percentage);

  // Filtered log table
  const filteredRecords = records.filter(record => {
    const matchesSubject = selectedSubject === 'all' || record.course_code === selectedSubject;
    const matchesStatus = selectedStatus === 'all' || record.status?.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSubject && matchesStatus;
  });

  const uniqueSubjects = Array.from(new Set(records.map(r => r.course_code).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CheckSquare className="w-7 h-7 text-indigo-600" />
          Attendance Ledger
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Verified official class presence records for {student?.full_name} ({student?.register_number}).
        </p>
      </div>

      {/* Threshold Warning Banner */}
      {isBelowThreshold && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900">
              Attendance Alert: Below Minimum University Eligibility Threshold ({ATTENDANCE_THRESHOLD}%)
            </h4>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Your overall attendance is currently <strong>{overallPercentage.toFixed(1)}%</strong>.
              University academic policy requires a minimum of {ATTENDANCE_THRESHOLD}% attendance to qualify for end-semester examinations.
              Ensure prompt attendance in upcoming lectures or submit valid medical leave certificates to the department head.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Attendance</span>
            <div className={`p-2 rounded-lg ${overallPercentage >= 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {totalSessions > 0 ? `${overallPercentage.toFixed(1)}%` : 'N/A'}
            </span>
            <span className="text-xs text-slate-500">of {totalSessions} sessions</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overallPercentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, overallPercentage)}%` }}
            />
          </div>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Attended Classes</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600">{presentCount}</span>
            <span className="text-xs text-slate-500">sessions present</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Recorded verified presence</p>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Missed Classes</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-600">{absentCount}</span>
            <span className="text-xs text-slate-500">sessions absent</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Unexcused missed sessions</p>
        </Card>
      </div>

      {/* Chart: Subject-wise Attendance */}
      {subjectBreakdown.length > 0 && (
        <Card className="p-6 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Subject-Wise Attendance Breakdown</h3>
              <p className="text-xs text-slate-500">
                Comparing attendance % against the 75% university eligibility requirement.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block w-3 h-3 bg-indigo-600 rounded"></span> Attended %
              <span className="inline-block w-3 h-0.5 bg-amber-500 ml-2"></span> 75% Requirement
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectBreakdown} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="courseCode" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Attendance']}
                  labelFormatter={(code) => {
                    const item = subjectBreakdown.find(s => s.courseCode === code);
                    return `${code} - ${item?.courseName || ''}`;
                  }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '75% Threshold', fill: '#d97706', fontSize: 11, position: 'top' }} />
                <Bar dataKey="percentage" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Attendance History Table with Filter */}
      <Card className="p-6 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Attendance Log</h3>
            <p className="text-xs text-slate-500">
              Showing {filteredRecords.length} of {records.length} total attendance records.
            </p>
          </div>
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Subjects</option>
              {uniqueSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Loading attendance records from database...
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-rose-500 text-sm">
            Failed to load attendance records.
            <button onClick={() => refetch()} className="ml-2 text-indigo-600 underline">Retry</button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">No attendance records found</p>
            <p className="text-xs text-slate-400 mt-1">
              {records.length > 0 ? 'Try clearing your filter selection.' : 'No sessions have been marked for this student in the database yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Course Code</th>
                  <th className="py-2.5 px-3">Course Name</th>
                  <th className="py-2.5 px-3">Session</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.map((item) => {
                  const isPresent = item.status?.toLowerCase() === 'present';
                  const isAbsent = item.status?.toLowerCase() === 'absent';
                  return (
                    <tr key={item.attendance_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {item.attendance_date}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-600">
                        {item.course_code}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.course_name || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {item.session || 'Regular'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isPresent
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {isPresent ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
