import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, DoorOpen } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';

const ROOM_TYPES = ['Lecture Hall', 'Lab', 'Seminar Room', 'Conference Room', 'Tutorial Room'];

interface ClassroomForm {
  room_number: string; building: string; capacity: string; room_type: string;
}
const emptyForm: ClassroomForm = { room_number: '', building: '', capacity: '60', room_type: 'Lecture Hall' };

export default function ClassroomsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<ClassroomForm>(emptyForm);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['classrooms', typeFilter],
    queryFn: async () => {
      let q = supabase.from('classrooms').select('*').order('building').order('room_number');
      if (typeFilter) q = q.eq('room_type', typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: ClassroomForm) => {
      const payload = { room_number: f.room_number, building: f.building, capacity: Number(f.capacity), room_type: f.room_type };
      if (editItem) {
        const { error } = await supabase.from('classrooms').update(payload).eq('classroom_id', editItem.classroom_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('classrooms').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classrooms'] }); toast.success(editItem ? 'Updated' : 'Classroom added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('classrooms').delete().eq('classroom_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classrooms'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ room_number: item.room_number, building: item.building, capacity: String(item.capacity), room_type: item.room_type });
    setModalOpen(true);
  };
  const f = (key: keyof ClassroomForm, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const filtered = (data ?? []).filter((c: any) =>
    !search || c.room_number.toLowerCase().includes(search.toLowerCase()) || c.building.toLowerCase().includes(search.toLowerCase())
  );

  const TYPE_COLORS: Record<string, string> = { 'Lecture Hall': 'bg-blue-50 text-blue-700', 'Lab': 'bg-purple-50 text-purple-700', 'Seminar Room': 'bg-amber-50 text-amber-700', 'Conference Room': 'bg-emerald-50 text-emerald-700', 'Tutorial Room': 'bg-slate-100 text-slate-600' };

  const columns = [
    { key: 'room_number', header: 'Room No.', width: '100px', render: (r: any) => <span className="font-mono font-semibold text-slate-800">{r.room_number}</span> },
    { key: 'building', header: 'Building', render: (r: any) => <span className="text-slate-700">{r.building}</span> },
    { key: 'room_type', header: 'Type', render: (r: any) => <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[r.room_type] ?? 'bg-slate-100 text-slate-600'}`}>{r.room_type}</span> },
    { key: 'capacity', header: 'Capacity', width: '90px', render: (r: any) => <span className="text-slate-700 font-medium">{r.capacity}</span> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.classroom_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold text-slate-900">Classrooms</h1><p className="text-sm text-slate-500">{filtered.length} rooms</p></div>
        <Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm(emptyForm); setModalOpen(true); }}>Add Room</Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]"><Input placeholder="Search by room or building..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={14} />} /></div>
        <Select options={ROOM_TYPES.map((t) => ({ value: t, label: t }))} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} placeholder="All Types" className="min-w-[160px]" />
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <DataTable columns={columns as any} data={filtered} keyField="classroom_id" isLoading={isLoading}
          emptyMessage="No classrooms found" emptyIcon={<DoorOpen size={36} />} />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Classroom' : 'Add Classroom'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate(form)} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Create'}</Button></>}>
        <div className="space-y-4">
          <Input label="Room Number" value={form.room_number} onChange={(e) => f('room_number', e.target.value)} required />
          <Input label="Building" value={form.building} onChange={(e) => f('building', e.target.value)} required />
          <Select label="Room Type" value={form.room_type} onChange={(e) => f('room_type', e.target.value)} options={ROOM_TYPES.map((t) => ({ value: t, label: t }))} />
          <Input label="Capacity" type="number" min="1" value={form.capacity} onChange={(e) => f('capacity', e.target.value)} required />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Classroom" message="Delete this classroom?" isLoading={deleteMutation.isPending} />
    </div>
  );
}
