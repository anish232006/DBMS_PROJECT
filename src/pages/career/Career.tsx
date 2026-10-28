import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { formatDate, getStatusColor } from '../../lib/utils';

const PAGE_SIZE = 15;

export function CompaniesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ company_name: '', industry: '', hr_contact_email: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['companies'], queryFn: async () => { const { data, error } = await supabase.from('companies').select('*').order('company_name'); if (error) throw error; return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editItem) { const { error } = await supabase.from('companies').update(form).eq('company_id', editItem.company_id); if (error) throw error; }
      else { const { error } = await supabase.from('companies').insert(form); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); toast.success(editItem ? 'Updated' : 'Company added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('companies').delete().eq('company_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ company_name: item.company_name, industry: item.industry ?? '', hr_contact_email: item.hr_contact_email ?? '' }); setModalOpen(true); };

  const columns = [
    { key: 'company_name', header: 'Company', render: (r: any) => <span className="font-semibold text-slate-900">{r.company_name}</span> },
    { key: 'industry', header: 'Industry', render: (r: any) => <Badge color="blue">{r.industry}</Badge> },
    { key: 'hr_contact_email', header: 'HR Email', render: (r: any) => <span className="text-xs text-slate-500">{r.hr_contact_email}</span> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.company_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Companies</h1><p className="text-sm text-slate-500">{(data ?? []).length} companies</p></div><Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ company_name: '', industry: '', hr_contact_email: '' }); setModalOpen(true); }}>Add Company</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="company_id" isLoading={isLoading} emptyMessage="No companies" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Company' : 'Add Company'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Input label="Company Name" value={form.company_name} onChange={(e) => setForm(p => ({ ...p, company_name: e.target.value }))} required />
          <Input label="Industry" value={form.industry} onChange={(e) => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="IT, Finance, Manufacturing..." />
          <Input label="HR Contact Email" type="email" value={form.hr_contact_email} onChange={(e) => setForm(p => ({ ...p, hr_contact_email: e.target.value }))} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Company" message="Delete this company?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function PlacementDrivesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ company_id: '', role_offered: '', package_lpa: '', drive_date: '', eligibility_criteria: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['placement-drives'],
    queryFn: async () => { const { data, error } = await supabase.from('placement_drives').select('*, companies(company_name, industry)').order('drive_date', { ascending: false }); if (error) throw error; return data ?? []; },
  });
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: async () => { const { data } = await supabase.from('companies').select('company_id, company_name').order('company_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, package_lpa: form.package_lpa ? Number(form.package_lpa) : null };
      if (editItem) { const { error } = await supabase.from('placement_drives').update(payload).eq('drive_id', editItem.drive_id); if (error) throw error; }
      else { const { error } = await supabase.from('placement_drives').insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['placement-drives'] }); toast.success(editItem ? 'Updated' : 'Drive added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('placement_drives').delete().eq('drive_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['placement-drives'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ company_id: item.company_id, role_offered: item.role_offered ?? '', package_lpa: item.package_lpa?.toString() ?? '', drive_date: item.drive_date ?? '', eligibility_criteria: item.eligibility_criteria ?? '' }); setModalOpen(true); };

  const columns = [
    { key: 'company', header: 'Company', render: (r: any) => <div><p className="font-semibold text-slate-900">{r.companies?.company_name}</p><p className="text-xs text-slate-400">{r.companies?.industry}</p></div> },
    { key: 'role_offered', header: 'Role', render: (r: any) => <span className="text-slate-700">{r.role_offered}</span> },
    { key: 'package_lpa', header: 'Package', render: (r: any) => <span className="font-semibold text-emerald-600">{r.package_lpa ? `₹${r.package_lpa} LPA` : '—'}</span> },
    { key: 'drive_date', header: 'Date', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.drive_date)}</span> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.drive_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Placement Drives</h1></div><Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ company_id: '', role_offered: '', package_lpa: '', drive_date: '', eligibility_criteria: '' }); setModalOpen(true); }}>Add Drive</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="drive_id" isLoading={isLoading} emptyMessage="No drives" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Drive' : 'Add Placement Drive'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Select label="Company" value={form.company_id} onChange={(e) => setForm(p => ({ ...p, company_id: e.target.value }))} options={(companies ?? []).map((c: any) => ({ value: c.company_id, label: c.company_name }))} placeholder="Select company" required />
          <Input label="Role Offered" value={form.role_offered} onChange={(e) => setForm(p => ({ ...p, role_offered: e.target.value }))} required />
          <Input label="Package (LPA)" type="number" value={form.package_lpa} onChange={(e) => setForm(p => ({ ...p, package_lpa: e.target.value }))} />
          <Input label="Drive Date" type="date" value={form.drive_date} onChange={(e) => setForm(p => ({ ...p, drive_date: e.target.value }))} />
          <Textarea label="Eligibility Criteria" value={form.eligibility_criteria} onChange={(e) => setForm(p => ({ ...p, eligibility_criteria: e.target.value }))} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Drive" message="Delete this placement drive?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function PlacementApplicationsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', drive_id: '', status: 'applied', applied_on: new Date().toISOString().slice(0, 10) });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['placement-applications', page, statusFilter],
    queryFn: async () => {
      let q = supabase.from('placement_applications').select('*, students(full_name, register_number), placement_drives(role_offered, companies(company_name))', { count: 'exact' }).order('applied_on', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, count, error } = await q;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; } });
  const { data: drives } = useQuery({ queryKey: ['placement-drives'], queryFn: async () => { const { data } = await supabase.from('placement_drives').select('drive_id, role_offered, companies(company_name)').order('drive_date', { ascending: false }); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('placement_applications').insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['placement-applications'] }); toast.success('Application submitted'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from('placement_applications').update({ status }).eq('placement_app_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['placement-applications'] }); toast.success('Status updated'); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const STATUS_FLOW = ['applied', 'shortlisted', 'selected', 'rejected'];
  const STATUS_COLORS: Record<string, string> = { applied: 'blue', shortlisted: 'yellow', selected: 'green', rejected: 'red' };

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div> },
    { key: 'drive', header: 'Drive / Role', render: (r: any) => <div><p className="font-medium">{(r.placement_drives as any)?.companies?.company_name}</p><p className="text-xs text-slate-500">{(r.placement_drives as any)?.role_offered}</p></div> },
    { key: 'applied_on', header: 'Applied', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.applied_on)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <Badge color={STATUS_COLORS[r.status] as any}>{r.status}</Badge> },
    { key: 'actions', header: 'Move to', width: '180px', render: (r: any) => {
      const nextStatuses = STATUS_FLOW.filter((s) => s !== r.status);
      return (
        <div className="flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {nextStatuses.map((s) => (
            <button key={s} onClick={() => updateStatus.mutate({ id: r.placement_app_id, status: s })}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors bg-${STATUS_COLORS[s] === 'green' ? 'emerald' : STATUS_COLORS[s]}-50 text-${STATUS_COLORS[s] === 'green' ? 'emerald' : STATUS_COLORS[s]}-700 hover:opacity-80`}>
              {s}
            </button>
          ))}
        </div>
      );
    }},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Placement Applications</h1><p className="text-sm text-slate-500">{data?.count ?? '...'} applications</p></div>
        <Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Add Application</Button>
      </div>
      {/* Funnel */}
      <div className="grid grid-cols-4 gap-3">
        {STATUS_FLOW.map((s) => {
          const count = (data?.data ?? []).filter((a: any) => a.status === s).length;
          return (
            <div key={s} className={`bg-white rounded-xl border border-slate-100 shadow-sm p-4 border-t-4 border-t-${s === 'selected' ? 'emerald' : s === 'rejected' ? 'red' : s === 'shortlisted' ? 'amber' : 'blue'}-400`}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <Select options={STATUS_FLOW.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All Statuses" className="max-w-[160px] mb-4" />
        <DataTable columns={columns as any} data={data?.data ?? []} keyField="placement_app_id" isLoading={isLoading} emptyMessage="No applications"
          currentPage={page} totalPages={totalPages} onPageChange={setPage} totalCount={data?.count} pageSize={PAGE_SIZE} />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Application" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>Submit</Button></>}>
        <div className="space-y-3">
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Select label="Placement Drive" value={form.drive_id} onChange={(e) => setForm(p => ({ ...p, drive_id: e.target.value }))} options={(drives ?? []).map((d: any) => ({ value: d.drive_id, label: `${(d.companies as any)?.company_name} — ${d.role_offered}` }))} placeholder="Select drive" required />
          <Input label="Applied On" type="date" value={form.applied_on} onChange={(e) => setForm(p => ({ ...p, applied_on: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

export function ResearchProjectsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ title: '', lead_faculty_id: '', funding_source: '', start_date: '', end_date: '', status: 'active' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['research-projects'], queryFn: async () => { const { data, error } = await supabase.from('research_projects').select('*, faculty(full_name)').order('start_date', { ascending: false }); if (error) throw error; return data ?? []; } });
  const { data: faculty } = useQuery({ queryKey: ['faculty-list-simple'], queryFn: async () => { const { data } = await supabase.from('faculty').select('faculty_id, full_name').order('full_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, lead_faculty_id: form.lead_faculty_id || null };
      if (editItem) { const { error } = await supabase.from('research_projects').update(payload).eq('project_id', editItem.project_id); if (error) throw error; }
      else { const { error } = await supabase.from('research_projects').insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['research-projects'] }); toast.success(editItem ? 'Updated' : 'Project added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('research_projects').delete().eq('project_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['research-projects'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ title: item.title, lead_faculty_id: item.lead_faculty_id ?? '', funding_source: item.funding_source ?? '', start_date: item.start_date ?? '', end_date: item.end_date ?? '', status: item.status ?? 'active' }); setModalOpen(true); };

  const columns = [
    { key: 'title', header: 'Project Title', render: (r: any) => <span className="font-semibold text-slate-900">{r.title}</span> },
    { key: 'lead', header: 'Lead Faculty', render: (r: any) => <span className="text-slate-700">{r.faculty?.full_name ?? '—'}</span> },
    { key: 'funding_source', header: 'Funding', render: (r: any) => <span className="text-slate-600">{r.funding_source}</span> },
    { key: 'start_date', header: 'Start', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.start_date)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <Badge color={getStatusColor(r.status) as any}>{r.status}</Badge> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.project_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Research Projects</h1></div><Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ title: '', lead_faculty_id: '', funding_source: '', start_date: '', end_date: '', status: 'active' }); setModalOpen(true); }}>Add Project</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="project_id" isLoading={isLoading} emptyMessage="No projects" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Project' : 'Add Project'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Input label="Project Title" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} required />
          <Select label="Lead Faculty" value={form.lead_faculty_id} onChange={(e) => setForm(p => ({ ...p, lead_faculty_id: e.target.value }))} options={(faculty ?? []).map((f: any) => ({ value: f.faculty_id, label: f.full_name }))} placeholder="Select faculty" />
          <Input label="Funding Source" value={form.funding_source} onChange={(e) => setForm(p => ({ ...p, funding_source: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm(p => ({ ...p, start_date: e.target.value }))} />
            <Input label="End Date" type="date" value={form.end_date} onChange={(e) => setForm(p => ({ ...p, end_date: e.target.value }))} />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))} options={[{ value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }, { value: 'paused', label: 'Paused' }]} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Project" message="Delete this research project?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function ResearchParticipantsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ project_id: '', student_id: '', role: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['research-participants'], queryFn: async () => { const { data, error } = await supabase.from('research_participants').select('*, research_projects(title), students(full_name, register_number)'); if (error) throw error; return data ?? []; } });
  const { data: projects } = useQuery({ queryKey: ['research-projects'], queryFn: async () => { const { data } = await supabase.from('research_projects').select('project_id, title').order('title'); return data ?? []; } });
  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('research_participants').insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['research-participants'] }); toast.success('Added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('research_participants').delete().eq('research_participant_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['research-participants'] }); toast.success('Removed'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const columns = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div> },
    { key: 'project', header: 'Project', render: (r: any) => <span className="text-slate-800">{r.research_projects?.title ?? '—'}</span> },
    { key: 'role', header: 'Role', render: (r: any) => <span className="text-slate-600">{r.role}</span> },
    { key: 'actions', header: '', width: '60px', render: (r: any) => <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.research_participant_id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Research Participants</h1></div><Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Add Participant</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="research_participant_id" isLoading={isLoading} emptyMessage="No records" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Research Participant" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>Add</Button></>}>
        <div className="space-y-3">
          <Select label="Project" value={form.project_id} onChange={(e) => setForm(p => ({ ...p, project_id: e.target.value }))} options={(projects ?? []).map((p: any) => ({ value: p.project_id, label: p.title }))} placeholder="Select project" required />
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Input label="Role" value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Researcher, Assistant..." />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Remove Participant" message="Remove this participant?" isLoading={deleteMutation.isPending} />
    </div>
  );
}

export function AlumniPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ student_id: '', current_company: '', designation: '', graduation_year: '', contact_email: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['alumni'], queryFn: async () => { const { data, error } = await supabase.from('alumni').select('*, students(full_name, register_number, department)').order('graduation_year', { ascending: false }); if (error) throw error; return data ?? []; } });
  const { data: students } = useQuery({ queryKey: ['students-select'], queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; } });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, graduation_year: form.graduation_year ? Number(form.graduation_year) : null };
      if (editItem) { const { error } = await supabase.from('alumni').update(payload).eq('alumni_id', editItem.alumni_id); if (error) throw error; }
      else { const { error } = await supabase.from('alumni').insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alumni'] }); toast.success(editItem ? 'Updated' : 'Alumni added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('alumni').delete().eq('alumni_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alumni'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => { setEditItem(item); setForm({ student_id: item.student_id, current_company: item.current_company ?? '', designation: item.designation ?? '', graduation_year: item.graduation_year?.toString() ?? '', contact_email: item.contact_email ?? '' }); setModalOpen(true); };

  const columns = [
    { key: 'name', header: 'Name', render: (r: any) => <div><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-slate-400">{r.students?.department}</p></div> },
    { key: 'graduation_year', header: 'Graduated', render: (r: any) => <span className="text-slate-700">{r.graduation_year}</span> },
    { key: 'current_company', header: 'Company', render: (r: any) => <span className="font-medium text-slate-800">{r.current_company}</span> },
    { key: 'designation', header: 'Designation', render: (r: any) => <span className="text-slate-600">{r.designation}</span> },
    { key: 'contact_email', header: 'Email', render: (r: any) => <span className="text-xs text-slate-500">{r.contact_email}</span> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.alumni_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">Alumni</h1><p className="text-sm text-slate-500">{(data ?? []).length} alumni</p></div><Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ student_id: '', current_company: '', designation: '', graduation_year: '', contact_email: '' }); setModalOpen(true); }}>Add Alumni</Button></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4"><DataTable columns={columns as any} data={data ?? []} keyField="alumni_id" isLoading={isLoading} emptyMessage="No alumni records" /></div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Alumni' : 'Add Alumni'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Select label="Student" value={form.student_id} onChange={(e) => setForm(p => ({ ...p, student_id: e.target.value }))} options={(students ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.register_number || s.roll_number})` }))} placeholder="Select student" required />
          <Input label="Current Company" value={form.current_company} onChange={(e) => setForm(p => ({ ...p, current_company: e.target.value }))} />
          <Input label="Designation" value={form.designation} onChange={(e) => setForm(p => ({ ...p, designation: e.target.value }))} />
          <Input label="Graduation Year" type="number" value={form.graduation_year} onChange={(e) => setForm(p => ({ ...p, graduation_year: e.target.value }))} />
          <Input label="Contact Email" type="email" value={form.contact_email} onChange={(e) => setForm(p => ({ ...p, contact_email: e.target.value }))} />
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Alumni" message="Delete this alumni record?" isLoading={deleteMutation.isPending} />
    </div>
  );
}
