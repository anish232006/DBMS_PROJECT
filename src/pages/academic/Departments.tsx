import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Building2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';

export default function DepartmentsPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ department_name: '', established_year: '', building: '', hod_faculty_id: '' });
  const qc = useQueryClient();

  const { data: departments, isLoading, error: deptError } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('department_id, department_name, established_year, building, hod_faculty_id, faculty!hod_faculty_id(full_name), courses(count)')
        .order('department_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: faculty } = useQuery({
    queryKey: ['faculty-list-simple'],
    queryFn: async () => {
      const { data } = await supabase.from('faculty').select('faculty_id, full_name').eq('status', 'active').order('full_name');
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        department_name: form.department_name,
        established_year: form.established_year ? Number(form.established_year) : null,
        building: form.building || null,
        hod_faculty_id: form.hod_faculty_id || null,
      };
      if (editItem) {
        const { error } = await supabase.from('departments').update(payload).eq('department_id', editItem.department_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('departments').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      toast.success(editItem ? 'Department updated' : 'Department created');
      setModalOpen(false);
    },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departments').delete().eq('department_id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed to delete', e.message),
  });

  const openCreate = () => { setEditItem(null); setForm({ department_name: '', established_year: '', building: '', hod_faculty_id: '' }); setModalOpen(true); };
  const openEdit = (d: any) => {
    setEditItem(d);
    setForm({ department_name: d.department_name ?? '', established_year: d.established_year?.toString() ?? '', building: d.building ?? '', hod_faculty_id: d.hod_faculty_id ?? '' });
    setModalOpen(true);
  };

  const filtered = (departments ?? []).filter((d: any) =>
    !search || d.department_name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'department_name', header: 'Department Name', render: (r: any) => <span className="font-semibold text-slate-900">{r.department_name}</span> },
    { key: 'building', header: 'Building', render: (r: any) => <span className="text-slate-600">{r.building ?? '—'}</span> },
    { key: 'established_year', header: 'Est. Year', render: (r: any) => <span className="text-slate-500 font-mono text-xs">{r.established_year ?? '—'}</span> },
    { key: 'hod', header: 'Head of Dept. (HoD)', render: (r: any) => <span className="text-slate-700 font-medium">{r.faculty?.full_name ?? '—'}</span> },
    { key: 'courses', header: 'Curriculum', render: (r: any) => (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        {r.courses?.[0]?.count ?? 0} courses
      </span>
    )},
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.department_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Departments</h1>
          <p className="text-sm text-slate-500">{filtered.length} departments</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={openCreate}>Add Department</Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        {deptError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-2.5 shadow-sm">
            <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Supabase connection error</p>
              <p className="text-xs text-red-650 mt-1">{(deptError as any)?.message ?? String(deptError)}</p>
            </div>
          </div>
        )}
        <Input placeholder="Search departments..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={14} />} className="max-w-xs mb-4" />
        <DataTable columns={columns as any} data={filtered} keyField="department_id" isLoading={isLoading}
          emptyMessage="No departments found" emptyIcon={<Building2 size={36} />} />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Department' : 'Add Department'} size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Create'}</Button>
        </>}>
        <div className="space-y-4">
          <Input label="Department Name" value={form.department_name} onChange={(e) => setForm(p => ({ ...p, department_name: e.target.value }))} required />
          <Input label="Building" value={form.building} onChange={(e) => setForm(p => ({ ...p, building: e.target.value }))} />
          <Input label="Established Year" type="number" value={form.established_year} onChange={(e) => setForm(p => ({ ...p, established_year: e.target.value }))} />
          <Select label="Head of Department (HoD)" value={form.hod_faculty_id} onChange={(e) => setForm(p => ({ ...p, hod_faculty_id: e.target.value }))}
            options={(faculty ?? []).map((f: any) => ({ value: f.faculty_id, label: f.full_name }))}
            placeholder="Select faculty" />
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Department" message="Delete this department?" isLoading={deleteMutation.isPending} />
    </div>
  );
}
