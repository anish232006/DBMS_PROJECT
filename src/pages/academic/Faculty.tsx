import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { formatDate, getStatusColor } from '../../lib/utils';
import { useDepartments } from '../../hooks/useDepartments';

const PAGE_SIZE = 15;
const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'HOD'];

interface FacultyForm {
  full_name: string; email: string; phone: string; department_id: string;
  designation: string; joining_date: string; status: string;
}
const emptyForm: FacultyForm = { full_name: '', email: '', phone: '', department_id: '', designation: '', joining_date: new Date().toISOString().slice(0, 10), status: 'active' };

export default function FacultyPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<FacultyForm>(emptyForm);
  const qc = useQueryClient();
  const { deptOptions } = useDepartments();

  const { data, isLoading } = useQuery({
    queryKey: ['faculty', page, search, deptFilter, statusFilter],
    queryFn: async () => {
      let q = supabase.from('faculty').select('*', { count: 'exact' }).order('full_name').range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      if (deptFilter) q = q.eq('department_id', deptFilter);
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, count, error } = await q;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: FacultyForm) => {
      if (editItem) {
        const { error } = await supabase.from('faculty').update(f).eq('faculty_id', editItem.faculty_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('faculty').insert(f);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faculty'] }); toast.success(editItem ? 'Faculty updated' : 'Faculty added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('faculty').delete().eq('faculty_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faculty'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ full_name: item.full_name ?? '', email: item.email ?? '', phone: item.phone ?? '', department_id: item.department_id ?? '', designation: item.designation ?? '', joining_date: item.joining_date ?? '', status: item.status ?? 'active' });
    setModalOpen(true);
  };
  const f = (key: keyof FacultyForm, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const columns = [
    { key: 'full_name', header: 'Name', render: (r: any) => <span className="font-medium text-slate-900">{r.full_name}</span> },
    { key: 'email', header: 'Email', render: (r: any) => <span className="text-xs text-slate-500">{r.email}</span> },
    { key: 'department', header: 'Department', render: (r: any) => <span className="text-xs text-slate-600">{r.department}</span> },
    { key: 'designation', header: 'Designation', render: (r: any) => <span className="text-sm text-slate-700">{r.designation}</span> },
    { key: 'joining_date', header: 'Joined', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.joining_date)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <Badge color={getStatusColor(r.status) as any}>{r.status}</Badge> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.faculty_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold text-slate-900">Faculty</h1><p className="text-sm text-slate-500">{data?.count ?? '...'} members</p></div>
        <Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm(emptyForm); setModalOpen(true); }}>Add Faculty</Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]"><Input placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={<Search size={14} />} /></div>
        <Select options={deptOptions} value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }} placeholder="All Departments" className="min-w-[180px]" />
        <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All Statuses" className="min-w-[140px]" />
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <DataTable columns={columns as any} data={data?.data ?? []} keyField="faculty_id" isLoading={isLoading}
          emptyMessage="No faculty found" emptyIcon={<UserCheck size={36} />}
          currentPage={page} totalPages={totalPages} onPageChange={setPage} totalCount={data?.count} pageSize={PAGE_SIZE} />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Faculty' : 'Add Faculty'} size="md"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate(form)} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Add'}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name" value={form.full_name} onChange={(e) => f('full_name', e.target.value)} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => f('email', e.target.value)} required />
          <Input label="Phone" value={form.phone} onChange={(e) => f('phone', e.target.value)} />
          <Select label="Department" value={form.department_id} onChange={(e) => f('department_id', e.target.value)} options={deptOptions} placeholder="Select dept." required />
          <Select label="Designation" value={form.designation} onChange={(e) => f('designation', e.target.value)} options={DESIGNATIONS.map((d) => ({ value: d, label: d }))} placeholder="Select" />
          <Input label="Joining Date" type="date" value={form.joining_date} onChange={(e) => f('joining_date', e.target.value)} />
          <Select label="Status" value={form.status} onChange={(e) => f('status', e.target.value)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Faculty" message="Remove this faculty member?" isLoading={deleteMutation.isPending} />
    </div>
  );
}
