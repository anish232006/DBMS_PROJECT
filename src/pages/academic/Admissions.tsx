import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckCircle, XCircle, ClipboardList } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { formatDate, getStatusColor } from '../../lib/utils';
import { useDepartments } from '../../hooks/useDepartments';

const PAGE_SIZE = 15;

interface AdmissionForm {
  applicant_name: string;
  date_of_birth: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  department_applied: string;
  previous_school: string;
  previous_percentage: string;
  application_date: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string;
}

const emptyForm: AdmissionForm = {
  applicant_name: '',
  date_of_birth: '',
  gender: '',
  email: '',
  phone: '',
  address: '',
  department_applied: '',
  previous_school: '',
  previous_percentage: '',
  application_date: new Date().toISOString().slice(0, 10),
  status: 'pending',
  reviewed_by: '',
};

export default function AdmissionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<AdmissionForm>(emptyForm);
  const qc = useQueryClient();
  const { deptOptions } = useDepartments();

  const { data, isLoading } = useQuery({
    queryKey: ['admissions', page, search, statusFilter, deptFilter],
    queryFn: async () => {
      let q = supabase
        .from('admissions')
        .select('*', { count: 'exact' })
        .order('application_date', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (search) q = q.or(`applicant_name.ilike.%${search}%,email.ilike.%${search}%`);
      if (statusFilter) q = q.eq('status', statusFilter);
      if (deptFilter) q = q.eq('department_id', deptFilter);
      const { data, count, error } = await q;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: AdmissionForm) => {
      const payload = { ...f, previous_percentage: f.previous_percentage ? Number(f.previous_percentage) : null };
      if (editItem) {
        const { error } = await supabase.from('admissions').update(payload).eq('application_id', editItem.application_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('admissions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      if (editItem?.status !== 'approved' && form.status === 'approved') {
        toast.success('Approved — student record created automatically', 'The database trigger has created a new student entry.');
      } else {
        toast.success(editItem ? 'Admission updated' : 'Application submitted');
      }
      setModalOpen(false);
    },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const quickStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('admissions').update({ status, reviewed_by: 'Admin' }).eq('application_id', id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      if (status === 'approved') {
        toast.success('Approved — student record created automatically', 'The database trigger has created a new student entry.');
      } else {
        toast.info(`Application ${status}`);
      }
    },
    onError: (e: any) => toast.error('Failed to update status', e.message),
  });

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (a: any) => {
    setEditItem(a);
    setForm({
      applicant_name: a.applicant_name ?? '',
      date_of_birth: a.date_of_birth ?? '',
      gender: a.gender ?? '',
      email: a.email ?? '',
      phone: a.phone ?? '',
      address: a.address ?? '',
      department_applied: a.department_applied ?? '',
      previous_school: a.previous_school ?? '',
      previous_percentage: a.previous_percentage?.toString() ?? '',
      application_date: a.application_date ?? '',
      status: a.status ?? 'pending',
      reviewed_by: a.reviewed_by ?? '',
    });
    setModalOpen(true);
  };

  const f = (key: keyof AdmissionForm, val: string) => setForm((p) => ({ ...p, [key]: val as any }));

  const columns = [
    { key: 'applicant_name', header: 'Applicant', render: (r: any) => (
      <span className="font-medium text-slate-900">{r.applicant_name}</span>
    )},
    { key: 'email', header: 'Email', render: (r: any) => (
      <span className="text-slate-500 text-xs">{r.email}</span>
    )},
    { key: 'department_applied', header: 'Department', render: (r: any) => (
      <span className="text-xs text-slate-600">{r.department_applied}</span>
    )},
    { key: 'previous_percentage', header: '%', width: '60px', render: (r: any) => (
      <span className="text-slate-700">{r.previous_percentage ?? '—'}</span>
    )},
    { key: 'application_date', header: 'Applied', render: (r: any) => (
      <span className="text-xs text-slate-500">{formatDate(r.application_date)}</span>
    )},
    { key: 'status', header: 'Status', render: (r: any) => (
      <Badge color={getStatusColor(r.status) as any}>{r.status}</Badge>
    )},
    { key: 'actions', header: '', width: '150px', render: (r: any) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {r.status === 'pending' && (
          <>
            <button
              onClick={() => quickStatus.mutate({ id: r.application_id, status: 'approved' })}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <CheckCircle size={12} /> Approve
            </button>
            <button
              onClick={() => quickStatus.mutate({ id: r.application_id, status: 'rejected' })}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <XCircle size={12} /> Reject
            </button>
          </>
        )}
        <button onClick={() => openEdit(r)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors text-xs">
          Edit
        </button>
      </div>
    )},
  ];

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">{data?.count ?? '...'} total applications</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={openCreate}>New Application</Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Search by name or email..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            icon={<Search size={14} />} />
        </div>
        <Select
          options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]}
          value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          placeholder="All Statuses" className="min-w-[140px]" />
        <Select
          options={deptOptions}
          value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
          placeholder="All Departments" className="min-w-[180px]" />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <DataTable
          columns={columns as any}
          data={data?.data ?? []}
          keyField="application_id"
          isLoading={isLoading}
          emptyMessage="No applications found"
          emptyIcon={<ClipboardList size={36} />}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalCount={data?.count}
          pageSize={PAGE_SIZE}
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Application' : 'New Application'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} isLoading={saveMutation.isPending}>
              {editItem ? 'Save Changes' : 'Submit Application'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Applicant Name" value={form.applicant_name} onChange={(e) => f('applicant_name', e.target.value)} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => f('email', e.target.value)} required />
          <Input label="Phone" value={form.phone} onChange={(e) => f('phone', e.target.value)} />
          <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={(e) => f('date_of_birth', e.target.value)} />
          <Select label="Gender" value={form.gender} onChange={(e) => f('gender', e.target.value)}
            options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]}
            placeholder="Select gender" />
          <Select label="Department Applied" value={form.department_applied} onChange={(e) => f('department_applied', e.target.value)}
            options={deptOptions} placeholder="Select dept." required />
          <Input label="Previous School" value={form.previous_school} onChange={(e) => f('previous_school', e.target.value)} />
          <Input label="Previous Percentage" type="number" min="0" max="100" value={form.previous_percentage}
            onChange={(e) => f('previous_percentage', e.target.value)} />
          <Input label="Application Date" type="date" value={form.application_date} onChange={(e) => f('application_date', e.target.value)} />
          <Select label="Status" value={form.status} onChange={(e) => f('status', e.target.value as any)}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]} />
          <div className="col-span-2">
            <Textarea label="Address" value={form.address} onChange={(e) => f('address', e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
