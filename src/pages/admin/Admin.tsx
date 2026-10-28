import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { formatDate, formatCurrency, getStatusColor } from '../../lib/utils';
import { useDepartments } from '../../hooks/useDepartments';

const PAGE_SIZE = 15;

export function FeeStructurePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ department_id: '', batch_year: '', total_fee: '' });
  const qc = useQueryClient();
  const { departments, deptOptions } = useDepartments();

  const { data, isLoading } = useQuery({ queryKey: ['fee-structure'], queryFn: async () => { const { data, error } = await supabase.from('fee_structure').select('*').order('department').order('batch_year'); if (error) throw error; return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { department_id: form.department_id, batch_year: Number(form.batch_year), total_fee: Number(form.total_fee) };
      if (editItem) { const { error } = await supabase.from('fee_structure').update(payload).eq('fee_id', editItem.fee_id); if (error) throw error; }
      else { const { error } = await supabase.from('fee_structure').insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-structure'] }); toast.success(editItem ? 'Updated' : 'Fee structure added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('fee_structure').delete().eq('fee_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-structure'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ department_id: item.department_id ?? '', batch_year: String(item.batch_year), total_fee: String(item.total_fee) }); setModalOpen(true); };

  const columns = [
    { key: 'department', header: 'Department', render: (r: any) => {
      const dept = departments.find((d: any) => d.department_id === r.department_id);
      return <span className="font-medium text-slate-900">{dept?.department_name ?? r.department_id ?? '—'}</span>;
    }},
    { key: 'batch_year', header: 'Batch Year', render: (r: any) => <span className="text-slate-700">{r.batch_year}</span> },
    { key: 'total_fee', header: 'Total Fee', render: (r: any) => <span className="font-bold text-emerald-600">{formatCurrency(r.total_fee)}</span> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.fee_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Fee Structure</h1></div><Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ department_id: '', batch_year: '', total_fee: '' }); setModalOpen(true); }}>Add Fee</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="fee_id" isLoading={isLoading} emptyMessage="No fee structure defined" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Fee Structure' : 'Add Fee Structure'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Select label="Department" value={form.department_id} onChange={(e) => setForm(p => ({ ...p, department_id: e.target.value }))} options={deptOptions} placeholder="Select dept." required />
          <Input label="Batch Year" type="number" value={form.batch_year} onChange={(e) => setForm(p => ({ ...p, batch_year: e.target.value }))} required />
          <Input label="Total Fee (₹)" type="number" value={form.total_fee} onChange={(e) => setForm(p => ({ ...p, total_fee: e.target.value }))} required />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Fee Structure" message="Delete this fee structure?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function FinancePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', amount_paid: '', payment_date: new Date().toISOString().slice(0, 10), payment_mode: 'Online', status: 'paid' });
  const qc = useQueryClient();

  const { data: feeStructure } = useQuery({ queryKey: ['fee-structure'], queryFn: async () => { const { data } = await supabase.from('fee_structure').select('*'); return data ?? []; } });

  const { data, isLoading } = useQuery({
    queryKey: ['finance', page, search],
    queryFn: async () => {
      let q = supabase.from('finance_transactions').select('*, students(full_name, register_number, department, batch_year)', { count: 'exact' }).order('payment_date', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      const { data, count, error } = await q;
      if (error) throw error;
      const filtered = search ? (data ?? []).filter((t: any) => t.students?.full_name?.toLowerCase().includes(search.toLowerCase())) : (data ?? []);
      return { data: filtered, count: count ?? 0 };
    },
  });

  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number, department, batch_year').order('full_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('finance_transactions').insert({ ...form, amount_paid: Number(form.amount_paid) }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance'] }); toast.success('Payment recorded'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const getOutstanding = (student: any) => {
    if (!student) return null;
    const fee = (feeStructure ?? []).find((f: any) => f.department === student.department && f.batch_year === student.batch_year);
    if (!fee) return null;
    return fee.total_fee;
  };

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div> },
    { key: 'amount_paid', header: 'Amount Paid', render: (r: any) => <span className="font-semibold text-emerald-600">{formatCurrency(r.amount_paid)}</span> },
    { key: 'payment_date', header: 'Date', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.payment_date)}</span> },
    { key: 'payment_mode', header: 'Mode', render: (r: any) => <Badge color="slate">{r.payment_mode}</Badge> },
    { key: 'total_fee', header: 'Total Fee', render: (r: any) => {
      const fee = getOutstanding(r.students);
      return <span className="text-slate-600">{fee ? formatCurrency(fee) : '—'}</span>;
    }},
    { key: 'status', header: 'Status', render: (r: any) => <Badge color={getStatusColor(r.status) as any}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Finance Transactions</h1><p className="text-sm text-slate-500">{data?.count ?? '...'} records</p></div>
        <Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Record Payment</Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <Input placeholder="Search by student name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={<Search size={14} />} className="max-w-sm mb-4" />
        <DataTable columns={columns as any} data={data?.data ?? []} keyField="finance_txn_id" isLoading={isLoading} emptyMessage="No transactions"
          currentPage={page} totalPages={totalPages} onPageChange={setPage} totalCount={data?.count} pageSize={PAGE_SIZE} />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>Record</Button></>}>
        <div className="space-y-3">
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Input label="Amount Paid (₹)" type="number" value={form.amount_paid} onChange={(e) => setForm(p => ({ ...p, amount_paid: e.target.value }))} required />
          <Input label="Payment Date" type="date" value={form.payment_date} onChange={(e) => setForm(p => ({ ...p, payment_date: e.target.value }))} />
          <Select label="Payment Mode" value={form.payment_mode} onChange={(e) => setForm(p => ({ ...p, payment_mode: e.target.value }))} options={[{ value: 'Online', label: 'Online' }, { value: 'Cash', label: 'Cash' }, { value: 'Cheque', label: 'Cheque' }, { value: 'DD', label: 'DD' }]} />
          <Select label="Status" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))} options={[{ value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }]} />
        </div>
      </Modal>
    </div>
  );
}

export function InventoryPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ item_name: '', category: '', quantity: '', location: '', item_condition: 'Good' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['inventory'], queryFn: async () => { const { data, error } = await supabase.from('inventory_items').select('*').order('category').order('item_name'); if (error) throw error; return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, quantity: Number(form.quantity) };
      if (editItem) { const { error } = await supabase.from('inventory_items').update(payload).eq('item_id', editItem.item_id); if (error) throw error; }
      else { const { error } = await supabase.from('inventory_items').insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast.success(editItem ? 'Updated' : 'Item added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('inventory_items').delete().eq('item_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ item_name: item.item_name, category: item.category ?? '', quantity: String(item.quantity), location: item.location ?? '', item_condition: item.item_condition ?? 'Good' }); setModalOpen(true); };

  const filtered = (data ?? []).filter((i: any) => !search || i.item_name.toLowerCase().includes(search.toLowerCase()) || (i.category ?? '').toLowerCase().includes(search.toLowerCase()));

  const CONDITION_COLORS: Record<string, string> = { Good: 'green', Fair: 'yellow', Poor: 'red', 'New': 'blue' };

  const columns = [
    { key: 'item_name', header: 'Item', render: (r: any) => <span className="font-medium text-slate-900">{r.item_name}</span> },
    { key: 'category', header: 'Category', render: (r: any) => <span className="text-slate-600">{r.category}</span> },
    { key: 'quantity', header: 'Qty', render: (r: any) => <span className="font-semibold text-slate-700">{r.quantity}</span> },
    { key: 'location', header: 'Location', render: (r: any) => <span className="text-slate-500 text-xs">{r.location}</span> },
    { key: 'item_condition', header: 'Condition', render: (r: any) => <Badge color={(CONDITION_COLORS[r.item_condition] ?? 'slate') as any}>{r.item_condition}</Badge> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.item_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Inventory</h1></div><Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ item_name: '', category: '', quantity: '', location: '', item_condition: 'Good' }); setModalOpen(true); }}>Add Item</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={14} />} className="max-w-sm mb-4" />
        <DataTable columns={columns as any} data={filtered} keyField="item_id" isLoading={isLoading} emptyMessage="No inventory items" />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Item' : 'Add Item'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Input label="Item Name" value={form.item_name} onChange={(e) => setForm(p => ({ ...p, item_name: e.target.value }))} required />
          <Input label="Category" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Furniture, Electronics..." />
          <Input label="Quantity" type="number" value={form.quantity} onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))} required />
          <Input label="Location" value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} />
          <Select label="Condition" value={form.item_condition} onChange={(e) => setForm(p => ({ ...p, item_condition: e.target.value }))} options={['New', 'Good', 'Fair', 'Poor'].map((c) => ({ value: c, label: c }))} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Item" message="Delete this inventory item?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function GrievancesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ student_id: '', category: '', description: '', submitted_on: new Date().toISOString().slice(0, 10), status: 'open', resolved_by: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['grievances', page, statusFilter],
    queryFn: async () => {
      let q = supabase.from('grievances').select('*, students(full_name, register_number)', { count: 'exact' }).order('submitted_on', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, count, error } = await q;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editItem) { const { error } = await supabase.from('grievances').update(form).eq('grievance_id', editItem.grievance_id); if (error) throw error; }
      else { const { error } = await supabase.from('grievances').insert(form); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grievances'] }); toast.success(editItem ? 'Updated' : 'Grievance filed'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('grievances').delete().eq('grievance_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grievances'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ student_id: item.student_id, category: item.category ?? '', description: item.description ?? '', submitted_on: item.submitted_on ?? '', status: item.status, resolved_by: item.resolved_by ?? '' }); setModalOpen(true); };
  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div> },
    { key: 'category', header: 'Category', render: (r: any) => <Badge color="slate">{r.category}</Badge> },
    { key: 'description', header: 'Description', render: (r: any) => <span className="text-slate-600 text-xs line-clamp-2">{r.description}</span> },
    { key: 'submitted_on', header: 'Submitted', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.submitted_on)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <Badge color={getStatusColor(r.status) as any}>{r.status}</Badge> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.grievance_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Grievances</h1><p className="text-sm text-slate-500">{data?.count ?? '...'} total</p></div>
        <Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ student_id: '', category: '', description: '', submitted_on: new Date().toISOString().slice(0, 10), status: 'open', resolved_by: '' }); setModalOpen(true); }}>File Grievance</Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <Select options={[{ value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In Progress' }, { value: 'resolved', label: 'Resolved' }]} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All Statuses" className="max-w-[160px] mb-4" />
        <DataTable columns={columns as any} data={data?.data ?? []} keyField="grievance_id" isLoading={isLoading} emptyMessage="No grievances"
          currentPage={page} totalPages={totalPages} onPageChange={setPage} totalCount={data?.count} pageSize={PAGE_SIZE} />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Grievance' : 'File Grievance'} size="md"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Submit'}</Button></>}>
        <div className="space-y-3">
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Input label="Category" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Academic, Hostel, Transport..." />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Submitted On" type="date" value={form.submitted_on} onChange={(e) => setForm(p => ({ ...p, submitted_on: e.target.value }))} />
            <Select label="Status" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))} options={[{ value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In Progress' }, { value: 'resolved', label: 'Resolved' }]} />
          </div>
          {form.status === 'resolved' && <Input label="Resolved By" value={form.resolved_by} onChange={(e) => setForm(p => ({ ...p, resolved_by: e.target.value }))} />}
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Grievance" message="Delete this grievance?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function FeedbackPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', module_reference: '', rating: '5', comments: '', submitted_on: new Date().toISOString().slice(0, 10) });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['feedback', page],
    queryFn: async () => {
      const { data, count, error } = await supabase.from('feedback').select('*, students(full_name, register_number)', { count: 'exact' }).order('submitted_on', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('feedback').insert({ ...form, rating: Number(form.rating) }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feedback'] }); toast.success('Feedback submitted'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div> },
    { key: 'module_reference', header: 'Module', render: (r: any) => <span className="text-slate-700">{r.module_reference}</span> },
    { key: 'rating', header: 'Rating', render: (r: any) => (
      <div className="flex items-center gap-1">
        {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
        <span className="text-xs text-slate-500 ml-1">{r.rating}/5</span>
      </div>
    )},
    { key: 'comments', header: 'Comments', render: (r: any) => <span className="text-xs text-slate-500 line-clamp-1">{r.comments ?? '—'}</span> },
    { key: 'submitted_on', header: 'Date', render: (r: any) => <span className="text-xs text-slate-400">{formatDate(r.submitted_on)}</span> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Feedback</h1><p className="text-sm text-slate-500">{data?.count ?? '...'} entries</p></div><Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Add Feedback</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <DataTable columns={columns as any} data={data?.data ?? []} keyField="feedback_id" isLoading={isLoading} emptyMessage="No feedback"
          currentPage={page} totalPages={totalPages} onPageChange={setPage} totalCount={data?.count} pageSize={PAGE_SIZE} />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Feedback" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>Submit</Button></>}>
        <div className="space-y-3">
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Input label="Module Reference" value={form.module_reference} onChange={(e) => setForm(p => ({ ...p, module_reference: e.target.value }))} placeholder="Library, Hostel, Transport..." />
          <Select label="Rating (1-5)" value={form.rating} onChange={(e) => setForm(p => ({ ...p, rating: e.target.value }))} options={[1, 2, 3, 4, 5].map((r) => ({ value: String(r), label: `${r} ★` }))} />
          <Textarea label="Comments" value={form.comments} onChange={(e) => setForm(p => ({ ...p, comments: e.target.value }))} />
          <Input label="Submitted On" type="date" value={form.submitted_on} onChange={(e) => setForm(p => ({ ...p, submitted_on: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
