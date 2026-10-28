import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, CheckSquare, Users, Search } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { formatDate } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { useStudentCascade } from '../../hooks/useStudentCascade';

const PAGE_SIZE = 20;

// ─── Per-student attendance summary ────────────────────────────────────────────
function AttendanceSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, status, students(full_name, register_number, department_id, departments(department_name))');
      if (error) throw error;

      const map: Record<string, { name: string; roll: string; dept: string; total: number; present: number }> = {};
      (data ?? []).forEach((a: any) => {
        const id = a.student_id;
        if (!map[id])
          map[id] = {
            name: a.students?.full_name ?? '—',
            roll: a.students?.register_number ?? a.students?.roll_number ?? '—',
            dept: (a.students as any)?.departments?.department_name ?? '—',
            total: 0,
            present: 0,
          };
        map[id].total++;
        if (a.status === 'Present') map[id].present++;
      });

      return Object.entries(map)
        .map(([id, v]) => ({
          student_id: id,
          full_name: v.name,
          roll_number: v.roll,
          department: v.dept,
          total: v.total,
          present: v.present,
          pct: Math.round((v.present / v.total) * 100),
        }))
        .sort((a, b) => a.pct - b.pct);
    },
  });

  const summaryColumns = [
    { key: 'roll_number', header: 'Roll No.', width: '100px' },
    { key: 'full_name', header: 'Student', render: (r: any) => <span className="font-medium text-slate-900">{r.full_name}</span> },
    { key: 'department', header: 'Department', render: (r: any) => <span className="text-xs text-slate-500">{r.department}</span> },
    { key: 'total', header: 'Total Classes', render: (r: any) => <span className="text-slate-700">{r.total}</span> },
    { key: 'present', header: 'Present', render: (r: any) => <span className="text-emerald-600 font-medium">{r.present}</span> },
    {
      key: 'pct', header: 'Attendance %', render: (r: any) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[60px]">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${r.pct}%` }} />
          </div>
          <Badge color={r.pct >= 75 ? 'green' : r.pct >= 60 ? 'yellow' : 'red'}>{r.pct}%</Badge>
        </div>
      )
    },
  ];

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-900">Per-Student Attendance Summary</h3>
      </div>
      <DataTable columns={summaryColumns as any} data={data ?? []} keyField="student_id" isLoading={isLoading}
        emptyMessage="No attendance data" />
    </Card>
  );
}

// ─── Cascading Department → Section → Student picker ───────────────────────────
function CascadePicker({
  deptId, section, studentId,
  onDept, onSection, onStudent,
}: {
  deptId: string; section: string; studentId: string;
  onDept: (v: string) => void; onSection: (v: string) => void; onStudent: (v: string) => void;
}) {
  const { deptOptions, sectionOptions, studentOptions } = useStudentCascade(deptId, section);

  return (
    <div className="grid grid-cols-3 gap-3">
      <Select
        label="Department"
        value={deptId}
        onChange={(e) => { onDept(e.target.value); onSection(''); onStudent(''); }}
        options={deptOptions}
        placeholder="1. Select department"
        required
      />
      <Select
        label="Section"
        value={section}
        onChange={(e) => { onSection(e.target.value); onStudent(''); }}
        options={sectionOptions}
        placeholder={deptId ? 'Select section' : '— pick dept first —'}
        disabled={!deptId || sectionOptions.length === 0}
      />
      <Select
        label="Student"
        value={studentId}
        onChange={(e) => onStudent(e.target.value)}
        options={studentOptions}
        placeholder={deptId ? `${studentOptions.length} students` : '— pick dept first —'}
        disabled={!deptId}
        required
      />
    </div>
  );
}

function groupAttendance(records: any[]) {
  const groups: Record<string, Record<string, any[]>> = {};
  records.forEach((r) => {
    const deptName = r.departments?.department_name ?? 'Unknown Department';
    const courseName = `${r.course_name} (${r.course_code})`;
    if (!groups[deptName]) groups[deptName] = {};
    if (!groups[deptName][courseName]) groups[deptName][courseName] = [];
    groups[deptName][courseName].push(r);
  });
  return groups;
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'log' | 'summary' | 'mark'>('log');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Mark attendance form – cascade state
  const [markDept, setMarkDept] = useState('');
  const [markSection, setMarkSection] = useState('');
  const [markForm, setMarkForm] = useState({
    student_id: '', course_code: '',
    attendance_date: new Date().toISOString().slice(0, 10),
    session: 'Morning', status: 'Present', marked_by: 'Faculty',
  });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', page, search, statusFilter, courseFilter, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from('attendance')
        .select('*, students(full_name, register_number), departments(department_name)', { count: 'exact' })
        .order('department_id')
        .order('course_code')
        .order('attendance_date')
        .order('session')
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (statusFilter) q = q.eq('status', statusFilter);
      if (courseFilter) q = q.eq('course_code', courseFilter);
      if (dateFrom) q = q.gte('attendance_date', dateFrom);
      if (dateTo) q = q.lte('attendance_date', dateTo);
      const { data, count, error } = await q;
      if (error) throw error;
      const filtered = search
        ? (data ?? []).filter((a: any) => a.students?.full_name?.toLowerCase().includes(search.toLowerCase()))
        : (data ?? []);
      return { data: filtered, count: count ?? 0 };
    },
    enabled: activeTab === 'log',
  });

  const { data: courses } = useQuery({
    queryKey: ['courses-select'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('course_code, course_name').order('course_name');
      return data ?? [];
    },
  });

  const markMutation = useMutation({
    mutationFn: async () => {
      const courseObj = (courses ?? []).find((c: any) => c.course_code === markForm.course_code);
      const { error } = await supabase.from('attendance').insert({
        ...markForm,
        course_name: courseObj?.course_name ?? '',
        department_id: markDept || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance marked');
      setMarkForm(p => ({ ...p, student_id: '', status: 'Present' }));
      setMarkSection('');
    },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('attendance').delete().eq('attendance_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('Record deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const logColumns = [
    {
      key: 'student', header: 'Student', render: (r: any) => (
        <div><p className="font-medium text-slate-900 text-sm">{r.students?.full_name ?? '—'}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div>
      )
    },
    { key: 'course_name', header: 'Course', render: (r: any) => <div><p className="text-sm text-slate-700">{r.course_name}</p><code className="text-xs text-slate-400">{r.course_code}</code></div> },
    { key: 'attendance_date', header: 'Date', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.attendance_date)}</span> },
    { key: 'session', header: 'Session', render: (r: any) => <span className="text-slate-600">{r.session}</span> },
    {
      key: 'status', header: 'Status', render: (r: any) => (
        <Badge color={r.status === 'Present' ? 'green' : 'red'}>{r.status}</Badge>
      )
    },
    { key: 'marked_by', header: 'Marked By', render: (r: any) => <span className="text-xs text-slate-400">{r.marked_by ?? '—'}</span> },
    {
      key: 'actions', header: '', width: '60px', render: (r: any) => (
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.attendance_id); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      )
    },
  ];

  const tabs = [
    { id: 'log', label: 'Attendance Log' },
    { id: 'summary', label: 'Per-Student Summary' },
    { id: 'mark', label: 'Mark Attendance' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold text-slate-900">Attendance</h1></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-100 shadow-sm p-1 w-fit">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Log */}
      {activeTab === 'log' && (
        <>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder="Search by student name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={<Search size={14} />} />
            </div>
            <Select options={[{ value: 'Present', label: 'Present' }, { value: 'Absent', label: 'Absent' }]}
              value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All Statuses" className="min-w-[130px]" />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" className="min-w-[140px]" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" className="min-w-[140px]" />
          </div>
          <div className="space-y-6">
            {isLoading ? (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <DataTable columns={logColumns as any} data={[]} keyField="attendance_id" isLoading={true} />
              </div>
            ) : (data?.data ?? []).length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center text-slate-450">
                <CheckSquare size={36} className="mx-auto mb-3 opacity-40 text-slate-400" />
                <p className="text-sm font-medium">No attendance records found</p>
              </div>
            ) : (
              Object.entries(groupAttendance(data?.data ?? [])).map(([deptName, coursesGroup]) => (
                <div key={deptName} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
                    {deptName}
                  </h3>
                  <div className="space-y-6 pl-2">
                    {Object.entries(coursesGroup).map(([courseName, records]) => (
                      <div key={courseName} className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                          <span className="w-1 h-3 bg-slate-400 rounded-full" />
                          {courseName}
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-slate-100">
                          <table className="data-table w-full text-xs">
                            <thead>
                              <tr>
                                <th className="text-left p-3 font-semibold text-slate-650">Student</th>
                                <th className="text-left p-3 font-semibold text-slate-650">Date</th>
                                <th className="text-left p-3 font-semibold text-slate-650">Session</th>
                                <th className="text-left p-3 font-semibold text-slate-650">Status</th>
                                <th className="text-left p-3 font-semibold text-slate-650">Marked By</th>
                                <th className="w-[60px]"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {records.map((r: any) => (
                                <tr key={r.attendance_id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                                  <td className="p-3">
                                    <div>
                                      <p className="font-medium text-slate-800 text-sm">{r.students?.full_name ?? '—'}</p>
                                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{r.students?.register_number || r.students?.roll_number}</p>
                                    </div>
                                  </td>
                                  <td className="p-3 text-slate-550">{formatDate(r.attendance_date)}</td>
                                  <td className="p-3 text-slate-550">{r.session}</td>
                                  <td className="p-3">
                                    <Badge color={r.status === 'Present' ? 'green' : 'red'}>{r.status}</Badge>
                                  </td>
                                  <td className="p-3 text-slate-400">{r.marked_by ?? '—'}</td>
                                  <td className="p-3 text-right">
                                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.attendance_id); }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-650 hover:bg-red-50 transition-colors">
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* Pagination Controls */}
            {data && data.count > PAGE_SIZE && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-medium">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.count)} of {data.count} records
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>Previous</Button>
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>Next</Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'summary' && <AttendanceSummary />}

      {/* Mark */}
      {activeTab === 'mark' && (
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <CheckSquare size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">Mark Attendance</h3>
          </div>

          <div className="space-y-4 max-w-2xl">
            {/* Step 1-3: cascading dept → section → student */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Step 1 — Locate student</p>
              <CascadePicker
                deptId={markDept}
                section={markSection}
                studentId={markForm.student_id}
                onDept={setMarkDept}
                onSection={setMarkSection}
                onStudent={(v) => setMarkForm(p => ({ ...p, student_id: v }))}
              />
            </div>

            {/* Step 4: the rest of the form */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Step 2 — Class details</p>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Course" value={markForm.course_code}
                  onChange={(e) => setMarkForm(p => ({ ...p, course_code: e.target.value }))}
                  options={(courses ?? []).map((c: any) => ({ value: c.course_code, label: `${c.course_name} (${c.course_code})` }))}
                  placeholder="Select course" required />
                <Input label="Date" type="date" value={markForm.attendance_date}
                  onChange={(e) => setMarkForm(p => ({ ...p, attendance_date: e.target.value }))} />
                <Select label="Session" value={markForm.session}
                  onChange={(e) => setMarkForm(p => ({ ...p, session: e.target.value }))}
                  options={[{ value: 'Morning', label: 'Morning' }, { value: 'Afternoon', label: 'Afternoon' }, { value: 'Evening', label: 'Evening' }]} />
                <Select label="Status" value={markForm.status}
                  onChange={(e) => setMarkForm(p => ({ ...p, status: e.target.value }))}
                  options={[{ value: 'Present', label: 'Present' }, { value: 'Absent', label: 'Absent' }]} />
                <Input label="Marked By" value={markForm.marked_by}
                  onChange={(e) => setMarkForm(p => ({ ...p, marked_by: e.target.value }))} />
              </div>
            </div>

            <Button icon={<CheckSquare size={15} />} onClick={() => markMutation.mutate()} isLoading={markMutation.isPending}
              disabled={!markForm.student_id || !markForm.course_code}>
              Submit Attendance
            </Button>
          </div>
        </Card>
      )}

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Record" message="Delete this attendance record?" isLoading={deleteMutation.isPending} />
    </div>
  );
}
