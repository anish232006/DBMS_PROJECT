import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';

export default function FacultyWorkloadPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ faculty_id: '', course_code: '', hours_per_week: '4', academic_term: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['faculty-workload'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faculty_workload')
        .select('*, faculty(full_name, department), courses(course_name), departments(department_name)')
        .order('department_id')
        .order('faculty_id');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: faculty } = useQuery({ queryKey: ['faculty-list-simple'], queryFn: async () => { const { data } = await supabase.from('faculty').select('faculty_id, full_name, department_id').eq('status', 'active').order('full_name'); return data ?? []; } });
  const { data: courses } = useQuery({ queryKey: ['courses-select'], queryFn: async () => { const { data } = await supabase.from('courses').select('course_code, course_name').order('course_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const selectedFaculty = (faculty ?? []).find((f: any) => f.faculty_id === form.faculty_id);
      const payload = {
        ...form,
        hours_per_week: Number(form.hours_per_week),
        department_id: selectedFaculty?.department_id ?? null,
      };
      if (editItem) {
        const { error } = await supabase.from('faculty_workload').update(payload).eq('workload_id', editItem.workload_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('faculty_workload').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faculty-workload'] }); toast.success(editItem ? 'Updated' : 'Workload added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('faculty_workload').delete().eq('workload_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faculty-workload'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ faculty_id: item.faculty_id, course_code: item.course_code, hours_per_week: String(item.hours_per_week), academic_term: item.academic_term ?? '' });
    setModalOpen(true);
  };
  const f = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const columns = [
    { key: 'faculty', header: 'Faculty', render: (r: any) => <div><p className="font-medium text-slate-900">{r.faculty?.full_name ?? '—'}</p><p className="text-xs text-slate-400">{r.faculty?.department}</p></div> },
    { key: 'department', header: 'Department', render: (r: any) => <span className="font-semibold text-slate-700 text-xs">{r.departments?.department_name ?? '—'}</span> },
    { key: 'course', header: 'Course', render: (r: any) => <div><p className="text-sm text-slate-800">{r.courses?.course_name ?? '—'}</p><code className="text-xs text-slate-400">{r.course_code}</code></div> },
    { key: 'hours_per_week', header: 'Hrs/Week', render: (r: any) => (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="font-semibold text-blue-700">{r.hours_per_week}h</span>
      </div>
    )},
    { key: 'academic_term', header: 'Term', render: (r: any) => <span className="text-slate-600">{r.academic_term}</span> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.workload_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  // Compute workload summary per faculty
  const summary: Record<string, { name: string; total: number }> = {};
  (data ?? []).forEach((w: any) => {
    const id = w.faculty_id;
    if (!summary[id]) summary[id] = { name: w.faculty?.full_name ?? '—', total: 0 };
    summary[id].total += w.hours_per_week ?? 0;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold text-slate-900">Faculty Workload</h1><p className="text-sm text-slate-500">{(data ?? []).length} assignments</p></div>
        <Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ faculty_id: '', course_code: '', hours_per_week: '4', academic_term: '' }); setModalOpen(true); }}>Add Assignment</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.values(summary).sort((a, b) => b.total - a.total).slice(0, 10).map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
            <p className="text-xs font-semibold text-slate-700 truncate">{s.name}</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{s.total}h</p>
            <p className="text-[10px] text-slate-400">total hrs/week</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <DataTable columns={columns as any} data={data ?? []} keyField="workload_id" isLoading={isLoading}
          emptyMessage="No workload records" emptyIcon={<Clock size={36} />} />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Workload' : 'Assign Workload'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Assign'}</Button></>}>
        <div className="space-y-4">
          <Select label="Faculty" value={form.faculty_id} onChange={(e) => f('faculty_id', e.target.value)}
            options={(faculty ?? []).map((f: any) => ({ value: f.faculty_id, label: f.full_name }))} placeholder="Select faculty" required />
          <Select label="Course" value={form.course_code} onChange={(e) => f('course_code', e.target.value)}
            options={(courses ?? []).map((c: any) => ({ value: c.course_code, label: `${c.course_name} (${c.course_code})` }))} placeholder="Select course" required />
          <Input label="Hours per Week" type="number" min="1" max="20" value={form.hours_per_week} onChange={(e) => f('hours_per_week', e.target.value)} required />
          <Input label="Academic Term" value={form.academic_term} onChange={(e) => f('academic_term', e.target.value)} placeholder="e.g. 2025-26 Odd" />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Remove Assignment" message="Remove this workload assignment?" isLoading={deleteMutation.isPending} />
    </div>
  );
}
