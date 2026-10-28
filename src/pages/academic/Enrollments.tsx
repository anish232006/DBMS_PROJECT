import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { formatDate, getStatusColor } from '../../lib/utils';

const PAGE_SIZE = 15;

export default function EnrollmentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ student_id: '', course_code: '', academic_term: '', enrolled_on: new Date().toISOString().slice(0, 10), status: 'active' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['enrollments', page, search, statusFilter],
    queryFn: async () => {
      let q = supabase.from('enrollments')
        .select('*, students(full_name, register_number), courses(course_name), departments(department_name)', { count: 'exact' })
        .order('department_id')
        .order('course_code')
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, count, error } = await q;
      if (error) throw error;
      // filter by search after fetch (small result set)
      const filtered = search
        ? (data ?? []).filter((e: any) =>
            e.students?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            e.courses?.course_name?.toLowerCase().includes(search.toLowerCase()))
        : (data ?? []);
      return { data: filtered, count: count ?? 0 };
    },
  });

  const { data: students } = useQuery({
    queryKey: ['students-select'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('student_id, full_name, register_number, department_id').eq('status', 'active').order('full_name');
      return data ?? [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['courses-select'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('course_code, course_name').order('course_name');
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const selectedStudent = (students ?? []).find((s: any) => s.student_id === form.student_id);
      const payload = {
        ...form,
        department_id: selectedStudent?.department_id ?? null,
      };
      if (editItem) {
        const { error } = await supabase.from('enrollments').update(payload).eq('enrollment_id', editItem.enrollment_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('enrollments').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enrollments'] }); toast.success(editItem ? 'Updated' : 'Enrollment added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('enrollments').delete().eq('enrollment_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enrollments'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ student_id: item.student_id, course_code: item.course_code, academic_term: item.academic_term ?? '', enrolled_on: item.enrolled_on ?? '', status: item.status ?? 'active' });
    setModalOpen(true);
  };

  const f = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => (
      <div><p className="font-medium text-slate-900 text-sm">{r.students?.full_name ?? '—'}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div>
    )},
    { key: 'department', header: 'Department', render: (r: any) => <span className="font-semibold text-slate-700 text-xs">{r.departments?.department_name ?? '—'}</span> },
    { key: 'course', header: 'Course', render: (r: any) => (
      <div><p className="text-sm text-slate-800">{r.courses?.course_name ?? '—'}</p><code className="text-xs text-slate-400">{r.course_code}</code></div>
    )},
    { key: 'academic_term', header: 'Term', render: (r: any) => <span className="text-slate-600">{r.academic_term}</span> },
    { key: 'enrolled_on', header: 'Enrolled', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.enrolled_on)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <Badge color={getStatusColor(r.status) as any}>{r.status}</Badge> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.enrollment_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold text-slate-900">Enrollments</h1><p className="text-sm text-slate-500">{data?.count ?? '...'} records</p></div>
        <Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ student_id: '', course_code: '', academic_term: '', enrolled_on: new Date().toISOString().slice(0, 10), status: 'active' }); setModalOpen(true); }}>Enroll Student</Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]"><Input placeholder="Search by student or course..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={<Search size={14} />} /></div>
        <Select options={[{ value: 'active', label: 'Active' }, { value: 'dropped', label: 'Dropped' }, { value: 'completed', label: 'Completed' }]} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All Statuses" className="min-w-[140px]" />
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <DataTable columns={columns as any} data={data?.data ?? []} keyField="enrollment_id" isLoading={isLoading}
          emptyMessage="No enrollments found" currentPage={page} totalPages={totalPages} onPageChange={setPage} totalCount={data?.count} pageSize={PAGE_SIZE} />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Enrollment' : 'Enroll Student'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Enroll'}</Button></>}>
        <div className="space-y-4">
          <Select label="Student" value={form.student_id} onChange={(e) => f('student_id', e.target.value)}
            options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))}
            placeholder="Select student" required />
          <Select label="Course" value={form.course_code} onChange={(e) => f('course_code', e.target.value)}
            options={(courses ?? []).map((c: any) => ({ value: c.course_code, label: `${c.course_name} (${c.course_code})` }))}
            placeholder="Select course" required />
          <Input label="Academic Term" value={form.academic_term} onChange={(e) => f('academic_term', e.target.value)} placeholder="e.g. 2025-26 Odd" required />
          <Input label="Enrolled On" type="date" value={form.enrolled_on} onChange={(e) => f('enrolled_on', e.target.value)} />
          <Select label="Status" value={form.status} onChange={(e) => f('status', e.target.value)}
            options={[{ value: 'active', label: 'Active' }, { value: 'dropped', label: 'Dropped' }, { value: 'completed', label: 'Completed' }]} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Remove Enrollment" message="Remove this enrollment?" isLoading={deleteMutation.isPending} />
    </div>
  );
}
