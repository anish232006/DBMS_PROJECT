import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, Users } from 'lucide-react';
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

const GENDERS = ['Male', 'Female', 'Other'];
const STATUSES = ['active', 'inactive', 'suspended', 'graduated'];

interface StudentForm {
  register_number: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  department_id: string;
  batch_year: string;
  current_semester: string;
  admission_date: string;
  status: string;
}

const emptyForm: StudentForm = {
  register_number: '',
  full_name: '',
  date_of_birth: '',
  gender: '',
  email: '',
  phone: '',
  address: '',
  department_id: '',
  batch_year: new Date().getFullYear().toString(),
  current_semester: '1',
  admission_date: new Date().toISOString().slice(0, 10),
  status: 'active',
};

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { deptOptions } = useDepartments();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);

  const qc = useQueryClient();
  const navigate = useNavigate();

  const queryKey = ['students', page, search, deptFilter, statusFilter];

  // --------------------------------------------------
  // FETCH STUDENTS
  // --------------------------------------------------

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from('students')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (search) {
        q = q.or(
          `full_name.ilike.%${search}%,register_number.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      if (deptFilter) {
        q = q.eq('department_id', deptFilter);
      }

      if (statusFilter) {
        q = q.eq('status', statusFilter);
      }

      const { data, count, error } = await q;

      if (error) throw error;

      return {
        data: data ?? [],
        count: count ?? 0,
      };
    },
  });

  // --------------------------------------------------
  // CREATE STUDENT
  // --------------------------------------------------

  const createMutation = useMutation({
    mutationFn: async (f: StudentForm) => {
      const selectedDept = deptOptions.find(
        (d) => d.value === f.department_id
      );

      if (!selectedDept) {
        throw new Error('Please select a valid department');
      }

      const { error } = await supabase.from('students').insert({
        register_number: f.register_number,
        full_name: f.full_name,
        date_of_birth: f.date_of_birth || null,
        gender: f.gender || null,
        email: f.email,
        phone: f.phone || null,
        address: f.address || null,

        // Required by your Supabase table
        department: selectedDept.label,

        // Department UUID
        department_id: f.department_id,

        batch_year: Number(f.batch_year),
        current_semester: Number(f.current_semester),
        admission_date: f.admission_date || null,
        status: f.status,
      });

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student created successfully');

      setModalOpen(false);
      setForm(emptyForm);
    },

    onError: (e: any) => {
      console.error('Create student error:', e);
      toast.error('Failed to create student', e.message);
    },
  });

  // --------------------------------------------------
  // UPDATE STUDENT
  // --------------------------------------------------

  const updateMutation = useMutation({
    mutationFn: async (f: StudentForm) => {
      const selectedDept = deptOptions.find(
        (d) => d.value === f.department_id
      );

      if (!selectedDept) {
        throw new Error('Please select a valid department');
      }

      const { error } = await supabase
        .from('students')
        .update({
          register_number: f.register_number,
          full_name: f.full_name,
          date_of_birth: f.date_of_birth || null,
          gender: f.gender || null,
          email: f.email,
          phone: f.phone || null,
          address: f.address || null,

          // Required by your Supabase table
          department: selectedDept.label,

          // Department UUID
          department_id: f.department_id,

          batch_year: Number(f.batch_year),
          current_semester: Number(f.current_semester),
          admission_date: f.admission_date || null,
          status: f.status,
        })
        .eq('student_id', editStudent.student_id);

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student updated successfully');

      setModalOpen(false);
      setEditStudent(null);
    },

    onError: (e: any) => {
      console.error('Update student error:', e);
      toast.error('Failed to update student', e.message);
    },
  });

  // --------------------------------------------------
  // DELETE STUDENT
  // --------------------------------------------------

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('student_id', id);

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student deleted');
      setDeleteId(null);
    },

    onError: (e: any) => {
      console.error('Delete student error:', e);
      toast.error('Failed to delete student', e.message);
    },
  });

  // --------------------------------------------------
  // OPEN CREATE MODAL
  // --------------------------------------------------

  const openCreate = () => {
    setEditStudent(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  // --------------------------------------------------
  // OPEN EDIT MODAL
  // --------------------------------------------------

  const openEdit = (s: any) => {
    setEditStudent(s);

    setForm({
      register_number: s.register_number ?? '',
      full_name: s.full_name ?? '',
      date_of_birth: s.date_of_birth ?? '',
      gender: s.gender ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      address: s.address ?? '',
      department_id: s.department_id ?? '',
      batch_year: String(s.batch_year ?? ''),
      current_semester: String(s.current_semester ?? 1),
      admission_date: s.admission_date ?? '',
      status: s.status ?? 'active',
    });

    setModalOpen(true);
  };

  // --------------------------------------------------
  // SUBMIT FORM
  // --------------------------------------------------

  const handleSubmit = () => {
    if (
      !form.full_name ||
      !form.email ||
      !form.department_id ||
      !form.register_number
    ) {
      toast.error('Please fill all required fields');
      return;
    }

    if (editStudent) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  // --------------------------------------------------
  // FORM HELPER
  // --------------------------------------------------

  const f = (key: keyof StudentForm, val: string) => {
    setForm((p) => ({
      ...p,
      [key]: val,
    }));
  };

  const totalPages = Math.ceil(
    (data?.count ?? 0) / PAGE_SIZE
  );

  // --------------------------------------------------
  // TABLE COLUMNS
  // --------------------------------------------------

  const columns = [
    {
      key: 'register_number',
      header: 'Register No.',
      width: '120px',
    },

    {
      key: 'full_name',
      header: 'Name',
      render: (r: any) => (
        <span className="font-medium text-slate-900">
          {r.full_name}
        </span>
      ),
    },

    {
      key: 'department',
      header: 'Department',
      render: (r: any) => (
        <span className="text-slate-600 text-xs">
          {r.department}
        </span>
      ),
    },

    {
      key: 'batch_year',
      header: 'Batch',
      width: '70px',
    },

    {
      key: 'current_semester',
      header: 'Sem.',
      width: '60px',
    },

    {
      key: 'status',
      header: 'Status',
      render: (r: any) => (
        <Badge color={getStatusColor(r.status) as any}>
          {r.status}
        </Badge>
      ),
    },

    {
      key: 'admission_date',
      header: 'Joined',
      render: (r: any) => (
        <span className="text-slate-500 text-xs">
          {formatDate(r.admission_date)}
        </span>
      ),
    },

    {
      key: 'actions',
      header: '',
      width: '110px',

      render: (r: any) => (
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() =>
              navigate(`/management/students/${r.student_id}`)
            }
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Eye size={14} />
          </button>

          <button
            onClick={() => openEdit(r)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Pencil size={14} />
          </button>

          <button
            onClick={() => setDeleteId(r.student_id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}

      <div className="flex items-center justify-between gap-4 flex-wrap">

        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Students
          </h1>

          <p className="text-sm text-slate-500 mt-0.5">
            {data?.count ?? '...'} total records
          </p>
        </div>

        <Button
          icon={<Plus size={15} />}
          onClick={openCreate}
        >
          Add Student
        </Button>

      </div>

      {/* Filters */}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">

        <div className="flex-1 min-w-[200px]">

          <Input
            placeholder="Search by name, register no, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            icon={<Search size={14} />}
          />

        </div>

        <Select
          options={deptOptions}
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value);
            setPage(1);
          }}
          placeholder="All Departments"
          className="min-w-[180px]"
        />

        <Select
          options={STATUSES.map((s) => ({
            value: s,
            label:
              s.charAt(0).toUpperCase() +
              s.slice(1),
          }))}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          placeholder="All Statuses"
          className="min-w-[140px]"
        />

      </div>

      {/* Table */}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">

        <DataTable
          columns={columns as any}
          data={data?.data ?? []}
          keyField="student_id"
          isLoading={isLoading}
          emptyMessage="No students found"
          emptyIcon={<Users size={36} />}
          onRowClick={(r) =>
            navigate(`/management/students/${r.student_id}`)
          }
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalCount={data?.count}
          pageSize={PAGE_SIZE}
        />

      </div>

      {/* Add/Edit Modal */}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editStudent
            ? 'Edit Student'
            : 'Add New Student'
        }
        size="lg"

        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              isLoading={
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editStudent
                ? 'Save Changes'
                : 'Create Student'}
            </Button>
          </>
        }
      >

        <div className="grid grid-cols-2 gap-4">

          <Input
            label="Register Number"
            value={form.register_number}
            onChange={(e) =>
              f(
                'register_number',
                e.target.value
              )
            }
            required
          />

          <Input
            label="Full Name"
            value={form.full_name}
            onChange={(e) =>
              f('full_name', e.target.value)
            }
            required
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) =>
              f('email', e.target.value)
            }
            required
          />

          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) =>
              f('phone', e.target.value)
            }
          />

          <Input
            label="Date of Birth"
            type="date"
            value={form.date_of_birth}
            onChange={(e) =>
              f(
                'date_of_birth',
                e.target.value
              )
            }
          />

          <Select
            label="Gender"
            value={form.gender}
            onChange={(e) =>
              f('gender', e.target.value)
            }
            options={GENDERS.map((g) => ({
              value: g,
              label: g,
            }))}
            placeholder="Select gender"
          />

          <Select
            label="Department"
            value={form.department_id}
            onChange={(e) =>
              f(
                'department_id',
                e.target.value
              )
            }
            options={deptOptions}
            placeholder="Select dept."
            required
          />

          <Input
            label="Batch Year"
            type="number"
            value={form.batch_year}
            onChange={(e) =>
              f(
                'batch_year',
                e.target.value
              )
            }
          />

          <Input
            label="Current Semester"
            type="number"
            min="1"
            max="8"
            value={form.current_semester}
            onChange={(e) =>
              f(
                'current_semester',
                e.target.value
              )
            }
          />

          <Input
            label="Admission Date"
            type="date"
            value={form.admission_date}
            onChange={(e) =>
              f(
                'admission_date',
                e.target.value
              )
            }
          />

          <Select
            label="Status"
            value={form.status}
            onChange={(e) =>
              f('status', e.target.value)
            }
            options={STATUSES.map((s) => ({
              value: s,
              label:
                s.charAt(0).toUpperCase() +
                s.slice(1),
            }))}
          />

          <div className="col-span-2">

            <Input
              label="Address"
              value={form.address}
              onChange={(e) =>
                f(
                  'address',
                  e.target.value
                )
              }
            />

          </div>

        </div>

      </Modal>

      {/* Delete Confirmation */}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() =>
          deleteId &&
          deleteMutation.mutate(deleteId)
        }
        title="Delete Student"
        message="Are you sure you want to delete this student? This will also affect their related records."
        isLoading={deleteMutation.isPending}
      />

    </div>
  );
}