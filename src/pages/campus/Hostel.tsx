import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { getStatusColor } from '../../lib/utils';

export function HostelRoomsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ block: '', room_number: '', capacity: '4', occupied_count: '0' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['hostel-rooms'],
    queryFn: async () => { const { data, error } = await supabase.from('hostel_rooms').select('*').order('block').order('room_number'); if (error) throw error; return data ?? []; },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { block: form.block, room_number: form.room_number, capacity: Number(form.capacity), occupied_count: Number(form.occupied_count) };
      if (editItem) { const { error } = await supabase.from('hostel_rooms').update(payload).eq('room_id', editItem.room_id); if (error) throw error; }
      else { const { error } = await supabase.from('hostel_rooms').insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-rooms'] }); toast.success(editItem ? 'Updated' : 'Room added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('hostel_rooms').delete().eq('room_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-rooms'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ block: item.block ?? '', room_number: item.room_number ?? '', capacity: String(item.capacity), occupied_count: String(item.occupied_count ?? 0) }); setModalOpen(true); };

  const columns = [
    { key: 'block', header: 'Block', render: (r: any) => <span className="font-semibold text-slate-800">{r.block}</span> },
    { key: 'room_number', header: 'Room No.' },
    { key: 'capacity', header: 'Capacity' },
    { key: 'occupied_count', header: 'Occupied', render: (r: any) => <span className="font-medium text-slate-700">{r.occupied_count ?? 0}</span> },
    { key: 'available', header: 'Available', render: (r: any) => {
      const avail = (r.capacity ?? 0) - (r.occupied_count ?? 0);
      return <Badge color={avail > 0 ? 'green' : 'red'}>{avail} seats</Badge>;
    }},
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.room_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Hostel Rooms</h1><p className="text-sm text-slate-500">{(data ?? []).length} rooms</p></div><Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ block: '', room_number: '', capacity: '4', occupied_count: '0' }); setModalOpen(true); }}>Add Room</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="room_id" isLoading={isLoading} emptyMessage="No rooms" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Room' : 'Add Hostel Room'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Input label="Block" value={form.block} onChange={(e) => setForm(p => ({ ...p, block: e.target.value }))} required />
          <Input label="Room Number" value={form.room_number} onChange={(e) => setForm(p => ({ ...p, room_number: e.target.value }))} required />
          <Input label="Capacity" type="number" value={form.capacity} onChange={(e) => setForm(p => ({ ...p, capacity: e.target.value }))} />
          <Input label="Occupied Count" type="number" value={form.occupied_count} onChange={(e) => setForm(p => ({ ...p, occupied_count: e.target.value }))} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Room" message="Delete this room?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function HostelAllocationsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ student_id: '', room_id: '', allocated_on: new Date().toISOString().slice(0, 10), status: 'active' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['hostel-allocations'],
    queryFn: async () => { const { data, error } = await supabase.from('hostel_allocations').select('*, students(full_name, register_number), hostel_rooms(block, room_number)').order('allocated_on', { ascending: false }); if (error) throw error; return data ?? []; },
  });

  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; } });
  const { data: rooms } = useQuery({ queryKey: ['hostel-rooms'], queryFn: async () => { const { data } = await supabase.from('hostel_rooms').select('room_id, block, room_number').order('block'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('hostel_allocations').insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-allocations'] }); toast.success('Allocated'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('hostel_allocations').delete().eq('allocation_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-allocations'] }); toast.success('Removed'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div> },
    { key: 'room', header: 'Room', render: (r: any) => <span className="text-slate-700">Block {r.hostel_rooms?.block} · Room {r.hostel_rooms?.room_number}</span> },
    { key: 'allocated_on', header: 'Allocated On', render: (r: any) => <span className="text-xs text-slate-500">{r.allocated_on}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <Badge color={getStatusColor(r.status) as any}>{r.status}</Badge> },
    { key: 'actions', header: '', width: '60px', render: (r: any) => <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.allocation_id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Hostel Allocations</h1><p className="text-sm text-slate-500">{(data ?? []).length} allocations</p></div><Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Allocate Room</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="allocation_id" isLoading={isLoading} emptyMessage="No allocations" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Allocate Room" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>Allocate</Button></>}>
        <div className="space-y-3">
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Select label="Room" value={form.room_id} onChange={(e) => setForm(p => ({ ...p, room_id: e.target.value }))} options={(rooms ?? []).map((r: any) => ({ value: r.room_id, label: `Block ${r.block} · Room ${r.room_number}` }))} placeholder="Select room" required />
          <Input label="Allocated On" type="date" value={form.allocated_on} onChange={(e) => setForm(p => ({ ...p, allocated_on: e.target.value }))} />
          <Select label="Status" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))} options={[{ value: 'active', label: 'Active' }, { value: 'vacated', label: 'Vacated' }]} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Remove Allocation" message="Remove this hostel allocation?" isLoading={deleteMutation.isPending} />
    </div>
  );
}
