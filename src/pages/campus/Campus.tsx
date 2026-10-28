// Generic stub for remaining campus pages
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { formatDate } from '../../lib/utils';

export function ClubsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ club_name: '', category: '', faculty_advisor_id: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: async () => { const { data, error } = await supabase.from('clubs').select('*, faculty(full_name)').order('club_name'); if (error) throw error; return data ?? []; },
  });
  const { data: faculty } = useQuery({ queryKey: ['faculty-list-simple'], queryFn: async () => { const { data } = await supabase.from('faculty').select('faculty_id, full_name').order('full_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, faculty_advisor_id: form.faculty_advisor_id || null };
      if (editItem) { const { error } = await supabase.from('clubs').update(payload).eq('club_id', editItem.club_id); if (error) throw error; }
      else { const { error } = await supabase.from('clubs').insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clubs'] }); toast.success(editItem ? 'Updated' : 'Club created'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('clubs').delete().eq('club_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clubs'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ club_name: item.club_name, category: item.category ?? '', faculty_advisor_id: item.faculty_advisor_id ?? '' }); setModalOpen(true); };

  const columns = [
    { key: 'club_name', header: 'Club Name', render: (r: any) => <span className="font-medium text-slate-900">{r.club_name}</span> },
    { key: 'category', header: 'Category', render: (r: any) => <span className="text-slate-600">{r.category}</span> },
    { key: 'advisor', header: 'Faculty Advisor', render: (r: any) => <span className="text-slate-600">{r.faculty?.full_name ?? '—'}</span> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.club_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Clubs</h1><p className="text-sm text-slate-500">{(data ?? []).length} clubs</p></div><Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ club_name: '', category: '', faculty_advisor_id: '' }); setModalOpen(true); }}>Add Club</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="club_id" isLoading={isLoading} emptyMessage="No clubs" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Club' : 'Add Club'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Create'}</Button></>}>
        <div className="space-y-3">
          <Input label="Club Name" value={form.club_name} onChange={(e) => setForm(p => ({ ...p, club_name: e.target.value }))} required />
          <Input label="Category" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Cultural, Technical, Sports..." />
          <Select label="Faculty Advisor" value={form.faculty_advisor_id} onChange={(e) => setForm(p => ({ ...p, faculty_advisor_id: e.target.value }))} options={(faculty ?? []).map((f: any) => ({ value: f.faculty_id, label: f.full_name }))} placeholder="Select advisor" />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Club" message="Delete this club?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function ClubMembershipsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ student_id: '', club_id: '', role: 'Member', joined_on: new Date().toISOString().slice(0, 10) });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['club-memberships'],
    queryFn: async () => { const { data, error } = await supabase.from('club_memberships').select('*, students(full_name, register_number), clubs(club_name, category)').order('joined_on', { ascending: false }); if (error) throw error; return data ?? []; },
  });
  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; } });
  const { data: clubs } = useQuery({ queryKey: ['clubs'], queryFn: async () => { const { data } = await supabase.from('clubs').select('club_id, club_name').order('club_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('club_memberships').insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['club-memberships'] }); toast.success('Member added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('club_memberships').delete().eq('membership_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['club-memberships'] }); toast.success('Removed'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div> },
    { key: 'club', header: 'Club', render: (r: any) => <div><p className="font-medium">{r.clubs?.club_name}</p><p className="text-xs text-slate-400">{r.clubs?.category}</p></div> },
    { key: 'role', header: 'Role', render: (r: any) => <span className="text-slate-700">{r.role}</span> },
    { key: 'joined_on', header: 'Joined', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.joined_on)}</span> },
    { key: 'actions', header: '', width: '60px', render: (r: any) => <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.membership_id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Club Memberships</h1><p className="text-sm text-slate-500">{(data ?? []).length} members</p></div><Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Add Member</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="membership_id" isLoading={isLoading} emptyMessage="No memberships" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Club Member" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>Add</Button></>}>
        <div className="space-y-3">
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Select label="Club" value={form.club_id} onChange={(e) => setForm(p => ({ ...p, club_id: e.target.value }))} options={(clubs ?? []).map((c: any) => ({ value: c.club_id, label: c.club_name }))} placeholder="Select club" required />
          <Input label="Role" value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Member, President, Secretary..." />
          <Input label="Joined On" type="date" value={form.joined_on} onChange={(e) => setForm(p => ({ ...p, joined_on: e.target.value }))} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Remove Member" message="Remove this club member?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function EventsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ event_name: '', category: '', event_date: '', venue: '', organized_by: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => { const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: false }); if (error) throw error; return data ?? []; },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editItem) { const { error } = await supabase.from('events').update(form).eq('event_id', editItem.event_id); if (error) throw error; }
      else { const { error } = await supabase.from('events').insert(form); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success(editItem ? 'Updated' : 'Event created'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('events').delete().eq('event_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ event_name: item.event_name, category: item.category ?? '', event_date: item.event_date ?? '', venue: item.venue ?? '', organized_by: item.organized_by ?? '' }); setModalOpen(true); };

  const columns = [
    { key: 'event_name', header: 'Event', render: (r: any) => <span className="font-medium text-slate-900">{r.event_name}</span> },
    { key: 'category', header: 'Category' },
    { key: 'event_date', header: 'Date', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.event_date)}</span> },
    { key: 'venue', header: 'Venue', render: (r: any) => <span className="text-slate-600">{r.venue}</span> },
    { key: 'organized_by', header: 'Organized By', render: (r: any) => <span className="text-slate-500 text-xs">{r.organized_by}</span> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.event_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Events</h1><p className="text-sm text-slate-500">{(data ?? []).length} events</p></div><Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ event_name: '', category: '', event_date: '', venue: '', organized_by: '' }); setModalOpen(true); }}>Add Event</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="event_id" isLoading={isLoading} emptyMessage="No events" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Event' : 'Add Event'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Create'}</Button></>}>
        <div className="space-y-3">
          <Input label="Event Name" value={form.event_name} onChange={(e) => setForm(p => ({ ...p, event_name: e.target.value }))} required />
          <Input label="Category" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Cultural, Technical, Sports..." />
          <Input label="Event Date" type="date" value={form.event_date} onChange={(e) => setForm(p => ({ ...p, event_date: e.target.value }))} />
          <Input label="Venue" value={form.venue} onChange={(e) => setForm(p => ({ ...p, venue: e.target.value }))} />
          <Input label="Organized By" value={form.organized_by} onChange={(e) => setForm(p => ({ ...p, organized_by: e.target.value }))} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Event" message="Delete this event?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function EventParticipantsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ event_id: '', student_id: '', participation_type: 'Participant' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['event-participants'],
    queryFn: async () => { const { data, error } = await supabase.from('event_participants').select('*, events(event_name, event_date), students(full_name, register_number)').order('events(event_date)', { ascending: false }); if (error) throw error; return data ?? []; },
  });
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: async () => { const { data } = await supabase.from('events').select('event_id, event_name').order('event_name'); return data ?? []; } });
  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('event_participants').insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event-participants'] }); toast.success('Participant added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('event_participants').delete().eq('participant_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event-participants'] }); toast.success('Removed'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div> },
    { key: 'event', header: 'Event', render: (r: any) => <div><p className="font-medium">{r.events?.event_name}</p><p className="text-xs text-slate-400">{formatDate(r.events?.event_date)}</p></div> },
    { key: 'participation_type', header: 'Role', render: (r: any) => <span className="text-slate-700">{r.participation_type}</span> },
    { key: 'actions', header: '', width: '60px', render: (r: any) => <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.participant_id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Event Participants</h1><p className="text-sm text-slate-500">{(data ?? []).length} entries</p></div><Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Add Participant</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="participant_id" isLoading={isLoading} emptyMessage="No participants" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Participant" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>Add</Button></>}>
        <div className="space-y-3">
          <Select label="Event" value={form.event_id} onChange={(e) => setForm(p => ({ ...p, event_id: e.target.value }))} options={(events ?? []).map((ev: any) => ({ value: ev.event_id, label: ev.event_name }))} placeholder="Select event" required />
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Input label="Participation Type" value={form.participation_type} onChange={(e) => setForm(p => ({ ...p, participation_type: e.target.value }))} placeholder="Participant, Volunteer, Winner..." />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Remove Participant" message="Remove this participant?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function SportsTeamsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ sport_name: '', category: '', coach_faculty_id: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sports-teams'],
    queryFn: async () => { const { data, error } = await supabase.from('sports_teams').select('*, faculty(full_name)').order('sport_name'); if (error) throw error; return data ?? []; },
  });
  const { data: faculty } = useQuery({ queryKey: ['faculty-list-simple'], queryFn: async () => { const { data } = await supabase.from('faculty').select('faculty_id, full_name').order('full_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, coach_faculty_id: form.coach_faculty_id || null };
      if (editItem) { const { error } = await supabase.from('sports_teams').update(payload).eq('team_id', editItem.team_id); if (error) throw error; }
      else { const { error } = await supabase.from('sports_teams').insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sports-teams'] }); toast.success(editItem ? 'Updated' : 'Team created'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('sports_teams').delete().eq('team_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sports-teams'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ sport_name: item.sport_name, category: item.category ?? '', coach_faculty_id: item.coach_faculty_id ?? '' }); setModalOpen(true); };

  const columns = [
    { key: 'sport_name', header: 'Sport', render: (r: any) => <span className="font-medium text-slate-900">{r.sport_name}</span> },
    { key: 'category', header: 'Category' },
    { key: 'coach', header: 'Coach', render: (r: any) => <span className="text-slate-600">{r.faculty?.full_name ?? '—'}</span> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.team_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Sports Teams</h1><p className="text-sm text-slate-500">{(data ?? []).length} teams</p></div><Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ sport_name: '', category: '', coach_faculty_id: '' }); setModalOpen(true); }}>Add Team</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="team_id" isLoading={isLoading} emptyMessage="No teams" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Team' : 'Add Team'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Create'}</Button></>}>
        <div className="space-y-3">
          <Input label="Sport Name" value={form.sport_name} onChange={(e) => setForm(p => ({ ...p, sport_name: e.target.value }))} required />
          <Input label="Category" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Indoor, Outdoor..." />
          <Select label="Coach (Faculty)" value={form.coach_faculty_id} onChange={(e) => setForm(p => ({ ...p, coach_faculty_id: e.target.value }))} options={(faculty ?? []).map((f: any) => ({ value: f.faculty_id, label: f.full_name }))} placeholder="Select coach" />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Team" message="Delete this team?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function SportsParticipationPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ student_id: '', team_id: '', position: '', season: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sports-participation'],
    queryFn: async () => { const { data, error } = await supabase.from('sports_participation').select('*, students(full_name, register_number), sports_teams(sport_name, category)').order('season', { ascending: false }); if (error) throw error; return data ?? []; },
  });
  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; } });
  const { data: teams } = useQuery({ queryKey: ['sports-teams'], queryFn: async () => { const { data } = await supabase.from('sports_teams').select('team_id, sport_name').order('sport_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('sports_participation').insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sports-participation'] }); toast.success('Added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('sports_participation').delete().eq('participation_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sports-participation'] }); toast.success('Removed'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div> },
    { key: 'team', header: 'Sport / Team', render: (r: any) => <div><p className="font-medium">{r.sports_teams?.sport_name}</p><p className="text-xs text-slate-400">{r.sports_teams?.category}</p></div> },
    { key: 'position', header: 'Position', render: (r: any) => <span className="text-slate-700">{r.position}</span> },
    { key: 'season', header: 'Season', render: (r: any) => <span className="text-slate-500 text-xs">{r.season}</span> },
    { key: 'actions', header: '', width: '60px', render: (r: any) => <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.participation_id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Sports Participation</h1><p className="text-sm text-slate-500">{(data ?? []).length} entries</p></div><Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Add Participant</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="participation_id" isLoading={isLoading} emptyMessage="No records" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Sports Participant" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>Add</Button></>}>
        <div className="space-y-3">
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Select label="Team / Sport" value={form.team_id} onChange={(e) => setForm(p => ({ ...p, team_id: e.target.value }))} options={(teams ?? []).map((t: any) => ({ value: t.team_id, label: t.sport_name }))} placeholder="Select team" required />
          <Input label="Position" value={form.position} onChange={(e) => setForm(p => ({ ...p, position: e.target.value }))} placeholder="Player, Captain..." />
          <Input label="Season" value={form.season} onChange={(e) => setForm(p => ({ ...p, season: e.target.value }))} placeholder="2025-26" />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Remove Record" message="Remove this record?" isLoading={deleteMutation.isPending} />
    </div>
  );
}
