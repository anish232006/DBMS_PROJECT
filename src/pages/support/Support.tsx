import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { formatDate, getStatusColor } from '../../lib/utils';

const PAGE_SIZE = 15;

export function LibraryBooksPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', total_copies: '1', available_copies: '1' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['library-books'],
    queryFn: async () => { const { data, error } = await supabase.from('library_books').select('*').order('title'); if (error) throw error; return data ?? []; },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, total_copies: Number(form.total_copies), available_copies: Number(form.available_copies) };
      if (editItem) { const { error } = await supabase.from('library_books').update(payload).eq('book_id', editItem.book_id); if (error) throw error; }
      else { const { error } = await supabase.from('library_books').insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-books'] }); toast.success(editItem ? 'Updated' : 'Book added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('library_books').delete().eq('book_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-books'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ title: item.title, author: item.author, isbn: item.isbn ?? '', total_copies: String(item.total_copies), available_copies: String(item.available_copies) }); setModalOpen(true); };

  const filtered = (data ?? []).filter((b: any) => !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase()) || (b.isbn ?? '').includes(search));

  const columns = [
    { key: 'title', header: 'Title', render: (r: any) => <span className="font-medium text-slate-900">{r.title}</span> },
    { key: 'author', header: 'Author', render: (r: any) => <span className="text-slate-600">{r.author}</span> },
    { key: 'isbn', header: 'ISBN', render: (r: any) => <code className="text-xs text-slate-400">{r.isbn ?? '—'}</code> },
    { key: 'total_copies', header: 'Total', render: (r: any) => <span className="text-slate-700">{r.total_copies}</span> },
    { key: 'available_copies', header: 'Available', render: (r: any) => (
      <Badge color={r.available_copies > 0 ? 'green' : 'red'}>{r.available_copies}</Badge>
    )},
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.book_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Library Books</h1><p className="text-sm text-slate-500">{filtered.length} books</p></div><Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ title: '', author: '', isbn: '', total_copies: '1', available_copies: '1' }); setModalOpen(true); }}>Add Book</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <Input placeholder="Search by title, author, ISBN..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={14} />} className="max-w-sm mb-4" />
        <DataTable columns={columns as any} data={filtered} keyField="book_id" isLoading={isLoading} emptyMessage="No books found" />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Book' : 'Add Book'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} required />
          <Input label="Author" value={form.author} onChange={(e) => setForm(p => ({ ...p, author: e.target.value }))} required />
          <Input label="ISBN" value={form.isbn} onChange={(e) => setForm(p => ({ ...p, isbn: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Total Copies" type="number" value={form.total_copies} onChange={(e) => setForm(p => ({ ...p, total_copies: e.target.value }))} />
            <Input label="Available" type="number" value={form.available_copies} onChange={(e) => setForm(p => ({ ...p, available_copies: e.target.value }))} />
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Book" message="Delete this book?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function LibraryTransactionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', book_id: '', issue_date: new Date().toISOString().slice(0, 10), due_date: '', return_date: '', status: 'issued' });
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['library-transactions', page, statusFilter],
    queryFn: async () => {
      let q = supabase.from('library_transactions')
        .select('*, students(full_name, register_number), library_books(title)', { count: 'exact' })
        .order('issue_date', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, count, error } = await q;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; } });
  const { data: books } = useQuery({ queryKey: ['library-books'], queryFn: async () => { const { data } = await supabase.from('library_books').select('book_id, title, available_copies').order('title'); return data ?? []; } });

  const issueMutation = useMutation({
    mutationFn: async () => {
      const { error: txErr } = await supabase.from('library_transactions').insert({ ...form, status: 'issued' });
      if (txErr) throw txErr;
      // Decrement available_copies
      const book = (books ?? []).find((b: any) => b.book_id === form.book_id);
      if (book && (book as any).available_copies > 0) {
        await supabase.from('library_books').update({ available_copies: (book as any).available_copies - 1 }).eq('book_id', form.book_id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-transactions'] }); qc.invalidateQueries({ queryKey: ['library-books'] }); toast.success('Book issued'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const returnMutation = useMutation({
    mutationFn: async ({ id, bookId }: { id: string; bookId: string }) => {
      const { error } = await supabase.from('library_transactions').update({ status: 'returned', return_date: today }).eq('transaction_id', id);
      if (error) throw error;
      const book = (books ?? []).find((b: any) => b.book_id === bookId);
      if (book) await supabase.from('library_books').update({ available_copies: (book as any).available_copies + 1 }).eq('book_id', bookId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library-transactions'] }); qc.invalidateQueries({ queryKey: ['library-books'] }); toast.success('Book returned'); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div> },
    { key: 'book', header: 'Book', render: (r: any) => <span className="text-slate-800 font-medium">{r.library_books?.title ?? '—'}</span> },
    { key: 'issue_date', header: 'Issued', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.issue_date)}</span> },
    { key: 'due_date', header: 'Due', render: (r: any) => {
      const isOverdue = r.status === 'issued' && r.due_date && r.due_date < today;
      return (
        <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
          {isOverdue && <AlertCircle size={12} />}
          {formatDate(r.due_date)}
        </span>
      );
    }},
    { key: 'return_date', header: 'Returned', render: (r: any) => <span className="text-xs text-slate-500">{r.return_date ? formatDate(r.return_date) : '—'}</span> },
    { key: 'status', header: 'Status', render: (r: any) => {
      const isOverdue = r.status === 'issued' && r.due_date && r.due_date < today;
      return <Badge color={isOverdue ? 'red' : getStatusColor(r.status) as any}>{isOverdue ? 'overdue' : r.status}</Badge>;
    }},
    { key: 'actions', header: '', width: '80px', render: (r: any) => r.status === 'issued' ? (
      <button onClick={(e) => { e.stopPropagation(); returnMutation.mutate({ id: r.transaction_id, bookId: r.book_id }); }}
        className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
        Return
      </button>
    ) : null },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Library Transactions</h1><p className="text-sm text-slate-500">{data?.count ?? '...'} records</p></div>
        <Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Issue Book</Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <Select options={[{ value: 'issued', label: 'Issued' }, { value: 'returned', label: 'Returned' }]} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All Statuses" className="max-w-[160px] mb-4" />
        <DataTable columns={columns as any} data={data?.data ?? []} keyField="transaction_id" isLoading={isLoading} emptyMessage="No transactions"
          currentPage={page} totalPages={totalPages} onPageChange={setPage} totalCount={data?.count} pageSize={PAGE_SIZE} />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Issue Book" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => issueMutation.mutate()} isLoading={issueMutation.isPending}>Issue</Button></>}>
        <div className="space-y-3">
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Select label="Book" value={form.book_id} onChange={(e) => setForm(p => ({ ...p, book_id: e.target.value }))} options={(books ?? []).filter((b: any) => b.available_copies > 0).map((b: any) => ({ value: b.book_id, label: `${b.title} (${b.available_copies} avail.)` }))} placeholder="Select book" required />
          <Input label="Issue Date" type="date" value={form.issue_date} onChange={(e) => setForm(p => ({ ...p, issue_date: e.target.value }))} />
          <Input label="Due Date" type="date" value={form.due_date} onChange={(e) => setForm(p => ({ ...p, due_date: e.target.value }))} required />
        </div>
      </Modal>
    </div>
  );
}

export function TransportRoutesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ route_name: '', start_point: '', end_point: '', driver_name: '', vehicle_number: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['transport-routes'],
    queryFn: async () => { const { data, error } = await supabase.from('transport_routes').select('*').order('route_name'); if (error) throw error; return data ?? []; },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editItem) { const { error } = await supabase.from('transport_routes').update(form).eq('route_id', editItem.route_id); if (error) throw error; }
      else { const { error } = await supabase.from('transport_routes').insert(form); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-routes'] }); toast.success(editItem ? 'Updated' : 'Route added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('transport_routes').delete().eq('route_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-routes'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ route_name: item.route_name, start_point: item.start_point, end_point: item.end_point, driver_name: item.driver_name ?? '', vehicle_number: item.vehicle_number ?? '' }); setModalOpen(true); };

  const columns = [
    { key: 'route_name', header: 'Route', render: (r: any) => <span className="font-medium text-slate-900">{r.route_name}</span> },
    { key: 'start_point', header: 'Start', render: (r: any) => <span className="text-slate-600">{r.start_point}</span> },
    { key: 'end_point', header: 'End', render: (r: any) => <span className="text-slate-600">{r.end_point}</span> },
    { key: 'driver_name', header: 'Driver', render: (r: any) => <span className="text-slate-600">{r.driver_name ?? '—'}</span> },
    { key: 'vehicle_number', header: 'Vehicle', render: (r: any) => <code className="text-xs text-slate-500">{r.vehicle_number ?? '—'}</code> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.route_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Transport Routes</h1></div><Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ route_name: '', start_point: '', end_point: '', driver_name: '', vehicle_number: '' }); setModalOpen(true); }}>Add Route</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="route_id" isLoading={isLoading} emptyMessage="No routes" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Route' : 'Add Route'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Input label="Route Name" value={form.route_name} onChange={(e) => setForm(p => ({ ...p, route_name: e.target.value }))} required />
          <Input label="Start Point" value={form.start_point} onChange={(e) => setForm(p => ({ ...p, start_point: e.target.value }))} required />
          <Input label="End Point" value={form.end_point} onChange={(e) => setForm(p => ({ ...p, end_point: e.target.value }))} required />
          <Input label="Driver Name" value={form.driver_name} onChange={(e) => setForm(p => ({ ...p, driver_name: e.target.value }))} />
          <Input label="Vehicle Number" value={form.vehicle_number} onChange={(e) => setForm(p => ({ ...p, vehicle_number: e.target.value }))} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Route" message="Delete this route?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function TransportAllocationsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ student_id: '', route_id: '', pickup_point: '', status: 'active' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['transport-allocations'],
    queryFn: async () => { const { data, error } = await supabase.from('transport_allocations').select('*, students(full_name, register_number), transport_routes(route_name)'); if (error) throw error; return data ?? []; },
  });
  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; } });
  const { data: routes } = useQuery({ queryKey: ['transport-routes'], queryFn: async () => { const { data } = await supabase.from('transport_routes').select('route_id, route_name').order('route_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('transport_allocations').insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-allocations'] }); toast.success('Allocated'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('transport_allocations').delete().eq('transport_alloc_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-allocations'] }); toast.success('Removed'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div> },
    { key: 'route', header: 'Route', render: (r: any) => <span className="text-slate-700">{r.transport_routes?.route_name ?? '—'}</span> },
    { key: 'pickup_point', header: 'Pickup Point', render: (r: any) => <span className="text-slate-600">{r.pickup_point}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <Badge color={getStatusColor(r.status) as any}>{r.status}</Badge> },
    { key: 'actions', header: '', width: '60px', render: (r: any) => <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.transport_alloc_id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Transport Allocations</h1><p className="text-sm text-slate-500">{(data ?? []).length} allocations</p></div><Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Allocate Route</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="transport_alloc_id" isLoading={isLoading} emptyMessage="No allocations" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Allocate Transport" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>Allocate</Button></>}>
        <div className="space-y-3">
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Select label="Route" value={form.route_id} onChange={(e) => setForm(p => ({ ...p, route_id: e.target.value }))} options={(routes ?? []).map((r: any) => ({ value: r.route_id, label: r.route_name }))} placeholder="Select route" required />
          <Input label="Pickup Point" value={form.pickup_point} onChange={(e) => setForm(p => ({ ...p, pickup_point: e.target.value }))} required />
          <Select label="Status" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Remove Allocation" message="Remove this transport allocation?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function HealthRecordsPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ student_id: '', visit_date: new Date().toISOString().slice(0, 10), reason: '', diagnosis: '', attended_by: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['health-records', page],
    queryFn: async () => {
      const { data, count, error } = await supabase.from('health_records').select('*, students(full_name, register_number)', { count: 'exact' }).order('visit_date', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('health_records').insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['health-records'] }); toast.success('Record added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('health_records').delete().eq('record_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['health-records'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div> },
    { key: 'visit_date', header: 'Visit Date', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.visit_date)}</span> },
    { key: 'reason', header: 'Reason', render: (r: any) => <span className="text-slate-700 text-sm">{r.reason}</span> },
    { key: 'diagnosis', header: 'Diagnosis', render: (r: any) => <span className="text-slate-600 text-sm">{r.diagnosis}</span> },
    { key: 'attended_by', header: 'Attended By', render: (r: any) => <span className="text-slate-500 text-xs">{r.attended_by}</span> },
    { key: 'actions', header: '', width: '60px', render: (r: any) => <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.record_id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Health Records</h1><p className="text-sm text-slate-500">{data?.count ?? '...'} records</p></div><Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Add Record</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <DataTable columns={columns as any} data={data?.data ?? []} keyField="record_id" isLoading={isLoading} emptyMessage="No records"
          currentPage={page} totalPages={totalPages} onPageChange={setPage} totalCount={data?.count} pageSize={PAGE_SIZE} />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Health Record" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>Add</Button></>}>
        <div className="space-y-3">
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Input label="Visit Date" type="date" value={form.visit_date} onChange={(e) => setForm(p => ({ ...p, visit_date: e.target.value }))} />
          <Input label="Reason" value={form.reason} onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))} required />
          <Input label="Diagnosis" value={form.diagnosis} onChange={(e) => setForm(p => ({ ...p, diagnosis: e.target.value }))} />
          <Input label="Attended By" value={form.attended_by} onChange={(e) => setForm(p => ({ ...p, attended_by: e.target.value }))} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Record" message="Delete this health record?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function VisitorLogsPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ visitor_name: '', purpose: '', host_name: '', check_in: new Date().toISOString().slice(0, 16), check_out: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['visitor-logs', page],
    queryFn: async () => {
      const { data, count, error } = await supabase.from('visitor_logs').select('*', { count: 'exact' }).order('check_in', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('visitor_logs').insert({ ...form, check_in: form.check_in || null, check_out: form.check_out || null }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visitor-logs'] }); toast.success('Visitor logged'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const checkOutMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('visitor_logs').update({ check_out: new Date().toISOString() }).eq('visitor_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visitor-logs'] }); toast.success('Checked out'); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const columns = [
    { key: 'visitor_name', header: 'Visitor', render: (r: any) => <span className="font-medium text-slate-900">{r.visitor_name}</span> },
    { key: 'purpose', header: 'Purpose', render: (r: any) => <span className="text-slate-600">{r.purpose}</span> },
    { key: 'host_name', header: 'Host', render: (r: any) => <span className="text-slate-600">{r.host_name}</span> },
    { key: 'check_in', header: 'Check In', render: (r: any) => <span className="text-xs text-slate-500">{r.check_in ? new Date(r.check_in).toLocaleString() : '—'}</span> },
    { key: 'check_out', header: 'Check Out', render: (r: any) => <span className="text-xs text-slate-500">{r.check_out ? new Date(r.check_out).toLocaleString() : '—'}</span> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => !r.check_out ? (
      <button onClick={(e) => { e.stopPropagation(); checkOutMutation.mutate(r.visitor_id); }}
        className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
        Check Out
      </button>
    ) : <Badge color="green">Done</Badge> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Visitor Logs</h1><p className="text-sm text-slate-500">{data?.count ?? '...'} entries</p></div><Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Log Visitor</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <DataTable columns={columns as any} data={data?.data ?? []} keyField="visitor_id" isLoading={isLoading} emptyMessage="No visitor records"
          currentPage={page} totalPages={totalPages} onPageChange={setPage} totalCount={data?.count} pageSize={PAGE_SIZE} />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Visitor" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>Log</Button></>}>
        <div className="space-y-3">
          <Input label="Visitor Name" value={form.visitor_name} onChange={(e) => setForm(p => ({ ...p, visitor_name: e.target.value }))} required />
          <Input label="Purpose" value={form.purpose} onChange={(e) => setForm(p => ({ ...p, purpose: e.target.value }))} required />
          <Input label="Host Name" value={form.host_name} onChange={(e) => setForm(p => ({ ...p, host_name: e.target.value }))} />
          <Input label="Check In" type="datetime-local" value={form.check_in} onChange={(e) => setForm(p => ({ ...p, check_in: e.target.value }))} />
          <Input label="Check Out (optional)" type="datetime-local" value={form.check_out} onChange={(e) => setForm(p => ({ ...p, check_out: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
