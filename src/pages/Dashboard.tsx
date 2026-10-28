import { useQuery } from '@tanstack/react-query';
import {
  Users, ClipboardList, CheckSquare, MessageSquare,
  Calendar, Award, TrendingUp, AlertCircle,
  BookOpen, Home, Briefcase, GraduationCap,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { StatCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatDate, getStatusColor } from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Data Hooks ──────────────────────────────────────────────────────────────

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [
        { count: totalStudents },
        { count: pendingAdmissions },
        { count: openGrievances },
        attendanceRes,
        { count: upcomingEvents },
        examRes,
        { count: totalFaculty },
        { count: issuedBooks },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('admissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('grievances').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('attendance').select('status').gte('attendance_date', new Date().toISOString().slice(0, 10)),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('event_date', new Date().toISOString().slice(0, 10)),
        supabase.from('examinations').select('result'),
        supabase.from('faculty').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('library_transactions').select('*', { count: 'exact', head: true }).eq('status', 'issued'),
      ]);

      const todayAttendance = attendanceRes.data ?? [];
      const presentCount = todayAttendance.filter((a) => a.status === 'Present').length;
      const attendancePct = todayAttendance.length > 0
        ? Math.round((presentCount / todayAttendance.length) * 100)
        : null;

      const exams = examRes.data ?? [];
      const passCount = exams.filter((e) => e.result === 'Pass').length;
      const avgPassRate = exams.length > 0 ? Math.round((passCount / exams.length) * 100) : null;

      return {
        totalStudents: totalStudents ?? 0,
        pendingAdmissions: pendingAdmissions ?? 0,
        openGrievances: openGrievances ?? 0,
        attendancePct,
        upcomingEvents: upcomingEvents ?? 0,
        avgPassRate,
        totalFaculty: totalFaculty ?? 0,
        issuedBooks: issuedBooks ?? 0,
      };
    },
    staleTime: 30_000,
  });
}

function useRecentAdmissions() {
  return useQuery({
    queryKey: ['recent-admissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admissions')
        .select('application_id, applicant_name, department_applied, status, application_date')
        .order('application_date', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useRecentGrievances() {
  return useQuery({
    queryKey: ['recent-grievances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grievances')
        .select('grievance_id, category, description, submitted_on, status, students(full_name)')
        .order('submitted_on', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useUpcomingEvents() {
  return useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('event_id, event_name, category, event_date, venue')
        .gte('event_date', new Date().toISOString().slice(0, 10))
        .order('event_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useDeptEnrollmentData() {
  return useQuery({
    queryKey: ['dept-enrollment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('department')
        .eq('status', 'active');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((s) => {
        counts[s.department] = (counts[s.department] ?? 0) + 1;
      });
      return Object.entries(counts)
        .map(([dept, count]) => ({ dept: dept.replace('Engineering', 'Eng.').replace('Science', 'Sci.').replace('Technology', 'Tech.'), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
  });
}

function useAdmissionStatusData() {
  return useQuery({
    queryKey: ['admission-status'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admissions').select('status');
      if (error) throw error;
      const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
      (data ?? []).forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });
      return [
        { name: 'Pending', value: counts.pending, color: '#f59e0b' },
        { name: 'Approved', value: counts.approved, color: '#10b981' },
        { name: 'Rejected', value: counts.rejected, color: '#ef4444' },
      ];
    },
  });
}

// ─── Components ───────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, 'blue' | 'purple' | 'green' | 'yellow' | 'orange' | 'slate'> = {
  Cultural: 'blue',
  Technical: 'purple',
  Sports: 'green',
  Academic: 'yellow',
  Social: 'orange',
};

export default function Dashboard() {
  const stats = useDashboardStats();
  const admissions = useRecentAdmissions();
  const grievances = useRecentGrievances();
  const events = useUpcomingEvents();
  const deptData = useDeptEnrollmentData();
  const admissionStatus = useAdmissionStatusData();

  const s = stats.data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Students"
          value={s?.totalStudents ?? 0}
          icon={<Users size={20} />}
          color="blue"
          isLoading={stats.isLoading}
          subtitle="Currently enrolled"
        />
        <StatCard
          title="Pending Admissions"
          value={s?.pendingAdmissions ?? 0}
          icon={<ClipboardList size={20} />}
          color="amber"
          isLoading={stats.isLoading}
          subtitle="Awaiting review"
        />
        <StatCard
          title="Today's Attendance"
          value={s?.attendancePct != null ? `${s.attendancePct}%` : '—'}
          icon={<CheckSquare size={20} />}
          color="emerald"
          isLoading={stats.isLoading}
          subtitle="Present today"
        />
        <StatCard
          title="Open Grievances"
          value={s?.openGrievances ?? 0}
          icon={<MessageSquare size={20} />}
          color="red"
          isLoading={stats.isLoading}
          subtitle="Need attention"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming Events"
          value={s?.upcomingEvents ?? 0}
          icon={<Calendar size={20} />}
          color="purple"
          isLoading={stats.isLoading}
        />
        <StatCard
          title="Avg Pass Rate"
          value={s?.avgPassRate != null ? `${s.avgPassRate}%` : '—'}
          icon={<Award size={20} />}
          color="emerald"
          isLoading={stats.isLoading}
        />
        <StatCard
          title="Active Faculty"
          value={s?.totalFaculty ?? 0}
          icon={<GraduationCap size={20} />}
          color="blue"
          isLoading={stats.isLoading}
        />
        <StatCard
          title="Books Issued"
          value={s?.issuedBooks ?? 0}
          icon={<BookOpen size={20} />}
          color="slate"
          isLoading={stats.isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Department Enrollment Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Students by Department</h2>
          </div>
          {deptData.isLoading ? (
            <div className="skeleton h-48 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData.data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dept" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(v) => [v, 'Students']}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Admission Status Pie */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <ClipboardList size={18} className="text-amber-600" />
            <h2 className="text-base font-semibold text-slate-900">Admission Status</h2>
          </div>
          {admissionStatus.isLoading ? (
            <div className="skeleton h-48 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={admissionStatus.data} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {admissionStatus.data?.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Activity Feed Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Admissions */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">Recent Admissions</h2>
            </div>
          </div>
          <div className="space-y-3">
            {admissions.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)
              : (admissions.data ?? []).map((a) => (
                <div key={a.application_id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.applicant_name}</p>
                    <p className="text-xs text-slate-400 truncate">{a.department_applied} · {formatDate(a.application_date)}</p>
                  </div>
                  <Badge color={getStatusColor(a.status) as 'green' | 'yellow' | 'red'}>
                    {a.status}
                  </Badge>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Grievances */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-red-500" />
            <h2 className="text-sm font-semibold text-slate-900">Recent Grievances</h2>
          </div>
          <div className="space-y-3">
            {grievances.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)
              : (grievances.data ?? []).map((g: any) => (
                <div key={g.grievance_id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {g.students?.full_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{g.category} · {formatDate(g.submitted_on)}</p>
                  </div>
                  <Badge color={getStatusColor(g.status) as 'green' | 'yellow' | 'red'}>
                    {g.status}
                  </Badge>
                </div>
              ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-purple-600" />
            <h2 className="text-sm font-semibold text-slate-900">Upcoming Events</h2>
          </div>
          <div className="space-y-3">
            {events.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)
              : (events.data ?? []).map((ev) => (
                <div key={ev.event_id} className="flex items-start gap-3">
                  <div className="bg-purple-50 rounded-lg p-2 flex-shrink-0 text-center min-w-[40px]">
                    <p className="text-[10px] font-semibold text-purple-600 uppercase leading-tight">
                      {new Date(ev.event_date).toLocaleDateString('en', { month: 'short' })}
                    </p>
                    <p className="text-base font-bold text-purple-700 leading-tight">
                      {new Date(ev.event_date).getDate()}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{ev.event_name}</p>
                    <p className="text-xs text-slate-400 truncate">{ev.venue}</p>
                    <Badge color={CATEGORY_COLORS[ev.category] ?? 'slate'} className="mt-1">
                      {ev.category}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
