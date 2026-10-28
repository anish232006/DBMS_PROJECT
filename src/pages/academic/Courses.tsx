import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { useDepartments } from '../../hooks/useDepartments';

interface CourseForm {
  course_code: string; course_name: string; department_id: string; credits: string; semester: string;
}
const emptyForm: CourseForm = { course_code: '', course_name: '', department_id: '', credits: '3', semester: '1' };

export default function CoursesPage() {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const qc = useQueryClient();
  const { deptOptions } = useDepartments();

  const { data, isLoading } = useQuery({
    queryKey: ['courses', deptFilter, semFilter],
    queryFn: async () => {
      let q = supabase.from('courses').select('*').order('department').order('semester');
      if (deptFilter) q = q.eq('department_id', deptFilter);
      if (semFilter) q = q.eq('semester', Number(semFilter));
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: CourseForm) => {
      const selectedDept = deptOptions.find((d: any) => d.value === f.department_id);
      const payload = {
        course_code: f.course_code,
        course_name: f.course_name,
        department_id: f.department_id,
        department: selectedDept?.label || '',
        credits: Number(f.credits),
        semester: Number(f.semester),
      };
      if (editItem) {
        const { error } = await supabase.from('courses').update(payload).eq('course_code', editItem.course_code);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('courses').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); toast.success(editItem ? 'Course updated' : 'Course created'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.from('courses').delete().eq('course_code', code);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); toast.success('Deleted'); setDeleteCode(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (c: any) => {
    setEditItem(c);
    setForm({ course_code: c.course_code, course_name: c.course_name, department_id: c.department_id, credits: String(c.credits), semester: String(c.semester) });
    setModalOpen(true);
  };

  const filtered = (data ?? []).filter((c: any) =>
    !search || c.course_name.toLowerCase().includes(search.toLowerCase()) || c.course_code.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'course_code', header: 'Code', width: '120px', render: (r: any) => <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{r.course_code}</code> },
    { key: 'course_name', header: 'Course Name', render: (r: any) => <span className="font-medium text-slate-900">{r.course_name}</span> },
    { key: 'department', header: 'Department', render: (r: any) => <span className="text-xs text-slate-500">{r.department}</span> },
    { key: 'semester', header: 'Sem.', width: '60px' },
    { key: 'credits', header: 'Credits', width: '70px', render: (r: any) => <span className="text-blue-600 font-semibold">{r.credits}</span> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteCode(r.course_code)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  const f = (key: keyof CourseForm, val: string) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Courses</h1>
          <p className="text-sm text-slate-500">{filtered.length} courses</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm(emptyForm); setModalOpen(true); }}>Add Course</Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={14} />} className="flex-1 min-w-[200px]" />
          <Select options={deptOptions} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} placeholder="All Departments" className="min-w-[180px]" />
          <Select options={[1,2,3,4,5,6,7,8].map((s) => ({ value: String(s), label: `Semester ${s}` }))} value={semFilter} onChange={(e) => setSemFilter(e.target.value)} placeholder="All Semesters" className="min-w-[140px]" />
        </div>
        <DataTable columns={columns as any} data={filtered} keyField="course_code" isLoading={isLoading}
          emptyMessage="No courses found" emptyIcon={<BookOpen size={36} />} />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Course' : 'Add Course'} size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(form)} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Create'}</Button>
        </>}>
        <div className="space-y-4">
          <Input label="Course Code" value={form.course_code} onChange={(e) => f('course_code', e.target.value)} required disabled={!!editItem} />
          <Input label="Course Name" value={form.course_name} onChange={(e) => f('course_name', e.target.value)} required />
          <Select label="Department" value={form.department_id} onChange={(e) => f('department_id', e.target.value)}
            options={deptOptions} placeholder="Select dept." required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Credits" type="number" min="1" max="6" value={form.credits} onChange={(e) => f('credits', e.target.value)} />
            <Select label="Semester" value={form.semester} onChange={(e) => f('semester', e.target.value)}
              options={[1,2,3,4,5,6,7,8].map((s) => ({ value: String(s), label: `Semester ${s}` }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteCode} onClose={() => setDeleteCode(null)} onConfirm={() => deleteCode && deleteMutation.mutate(deleteCode)}
        title="Delete Course" message="Delete this course? This may affect related enrollments and attendance." isLoading={deleteMutation.isPending} />
    </div>
  );
}
