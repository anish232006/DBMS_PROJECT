import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Award } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { formatDate, getStatusColor } from '../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStudentCascade } from '../../hooks/useStudentCascade';

const PAGE_SIZE = 15;
const GRADES = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];
const EXAM_TYPES = ['Semester Final', 'Mid-Term', 'Internal', 'Quiz'];

// ─── Grade distribution chart ───────────────────────────────────────────────
function GradeDistributionChart({ courseCode }: { courseCode: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['grade-dist', courseCode],
    queryFn: async () => {
      const { data, error } = await supabase.from('examinations').select('grade').eq('course_code', courseCode);
      if (error) throw error;
      const counts: Record<string, number> = {};
      GRADES.forEach((g) => (counts[g] = 0));
      (data ?? []).forEach((e: any) => { if (e.grade) counts[e.grade] = (counts[e.grade] ?? 0) + 1; });
      return GRADES.map((g) => ({ grade: g, count: counts[g] }));
    },
    enabled: !!courseCode,
  });

  if (!courseCode) return null;
  if (isLoading) return <div className="skeleton h-32 rounded-lg mt-4" />;

  return (
    <div className="mt-5 pt-4 border-t border-slate-100">
      <p className="text-sm font-semibold text-slate-700 mb-3">Grade Distribution — {courseCode}</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Cascading picker (reused pattern) ──────────────────────────────────────
function CascadePicker({
  deptId, section, studentId,
  onDept, onSection, onStudent,
}: {
  deptId: string; section: string; studentId: string;
  onDept: (v: string) => void; onSection: (v: string) => void; onStudent: (v: string) => void;
}) {
  const { deptOptions, sectionOptions, studentOptions } = useStudentCascade(deptId, section);
  return (
    <div className="col-span-2 grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
      <Select
        label="Department"
        value={deptId}
        onChange={(e) => { onDept(e.target.value); onSection(''); onStudent(''); }}
        options={deptOptions}
        placeholder="1. Department"
        required
      />
      <Select
        label="Section"
        value={section}
        onChange={(e) => { onSection(e.target.value); onStudent(''); }}
        options={sectionOptions}
        placeholder={deptId ? 'Section' : '— dept first —'}
        disabled={!deptId || sectionOptions.length === 0}
      />
      <Select
        label="Student"
        value={studentId}
        onChange={(e) => onStudent(e.target.value)}
        options={studentOptions}
        placeholder={deptId ? `${studentOptions.length} students` : '— dept first —'}
        disabled={!deptId}
        required
      />
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ExaminationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [chartCourse, setChartCourse] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);

  // Cascade state (only used when adding new; editing shows existing student)
  const [formDept, setFormDept] = useState('');
  const [formSection, setFormSection] = useState('');

  const [form, setForm] = useState({
    student_id: '', course_code: '', exam_type: 'Semester Final',
    exam_date: new Date().toISOString().slice(0, 10),
    marks_obtained: '', max_marks: '100', grade: '', result: 'Pass',
  });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['examinations', page, search, resultFilter, courseFilter],
    queryFn: async () => {
      let q = supabase.from('examinations')
        .select('*, students(full_name, register_number), courses(course_name), departments(department_name)', { count: 'exact' })
        .order('department_id')
        .order('course_code')
        .order('student_id')
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (resultFilter) q = q.eq('result', resultFilter);
      if (courseFilter) q = q.eq('course_code', courseFilter);
      const { data, count, error } = await q;
      if (error) throw error;
      const filtered = search
        ? (data ?? []).filter((e: any) => e.students?.full_name?.toLowerCase().includes(search.toLowerCase()))
        : (data ?? []);
      return { data: filtered, count: count ?? 0 };
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['courses-select'],
    queryFn: async () => { const { data } = await supabase.from('courses').select('course_code, course_name').order('course_name'); return data ?? []; },
  });

  // We still need all students for the edit flow (to pre-populate an existing student)
  const { data: allStudents } = useQuery({
    queryKey: ['students-select'],
    queryFn: async () => { const { data } = await supabase.from('students').select('student_id, full_name, register_number').order('full_name'); return data ?? []; },
  });

  const saveMutation = useMutation({
  mutationFn: async () => {
    // Validate required fields before sending to Supabase
    if (!formDept && !editItem?.department_id) {
      throw new Error('Please select a department.');
    }

    if (!form.student_id) {
      throw new Error('Please select a student.');
    }

    if (!form.course_code) {
      throw new Error('Please select a course.');
    }

    if (!form.marks_obtained) {
      throw new Error('Please enter marks obtained.');
    }

    const marks = Number(form.marks_obtained);
    const maxMarks = Number(form.max_marks);

    if (Number.isNaN(marks) || Number.isNaN(maxMarks)) {
      throw new Error('Marks must be valid numbers.');
    }

    if (marks < 0 || marks > maxMarks) {
      throw new Error(`Marks obtained must be between 0 and ${maxMarks}.`);
    }

    // Automatically determine grade if not selected
    let calculatedGrade = form.grade;

    if (!calculatedGrade) {
      const percentage = (marks / maxMarks) * 100;

      if (percentage >= 90) calculatedGrade = 'A+';
      else if (percentage >= 80) calculatedGrade = 'A';
      else if (percentage >= 70) calculatedGrade = 'B+';
      else if (percentage >= 60) calculatedGrade = 'B';
      else if (percentage >= 50) calculatedGrade = 'C';
      else if (percentage >= 40) calculatedGrade = 'D';
      else calculatedGrade = 'F';
    }

    // Automatically determine Pass / Fail
    const calculatedResult = marks / maxMarks >= 0.40
      ? 'Pass'
      : 'Fail';

    const payload = {
      student_id: form.student_id,
      course_code: form.course_code,
      exam_type: form.exam_type,
      exam_date: form.exam_date || null,
      marks_obtained: marks,
      max_marks: maxMarks,
      grade: calculatedGrade,
      result: calculatedResult,
      department_id: formDept || editItem?.department_id,
    };

    console.log('Exam payload:', payload);

    if (editItem) {
      const { data, error } = await supabase
        .from('examinations')
        .update(payload)
        .eq('exam_id', editItem.exam_id)
        .select();

      if (error) throw error;

      console.log('Updated exam:', data);
    } else {
      const { data, error } = await supabase
        .from('examinations')
        .insert(payload)
        .select();

      if (error) throw error;

      console.log('Inserted exam:', data);
    }
  },

  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['examinations'] });
    qc.invalidateQueries({ queryKey: ['grade-dist'] });

    toast.success(
      editItem
        ? 'Exam result updated successfully'
        : 'Exam result added successfully'
    );

    setModalOpen(false);

    // Reset form after adding
    setForm({
      student_id: '',
      course_code: '',
      exam_type: 'Semester Final',
      exam_date: new Date().toISOString().slice(0, 10),
      marks_obtained: '',
      max_marks: '100',
      grade: '',
      result: 'Pass',
    });

    setFormDept('');
    setFormSection('');
  },

  onError: (e: any) => {
    console.error('Exam save error:', e);

    toast.error(
      'Failed to save exam result',
      e?.message || 'Unknown database error'
    );
  },
});

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('examinations').delete().eq('exam_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['examinations'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openAdd = () => {
    setEditItem(null);
    setFormDept(''); setFormSection('');
    setForm({ student_id: '', course_code: '', exam_type: 'Semester Final', exam_date: new Date().toISOString().slice(0, 10), marks_obtained: '', max_marks: '100', grade: '', result: 'Pass' });
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setFormDept(''); setFormSection(''); // reset cascade — student already known
    setForm({ student_id: item.student_id, course_code: item.course_code, exam_type: item.exam_type ?? 'Semester Final', exam_date: item.exam_date ?? '', marks_obtained: item.marks_obtained?.toString() ?? '', max_marks: item.max_marks?.toString() ?? '100', grade: item.grade ?? '', result: item.result ?? 'Pass' });
    setModalOpen(true);
  };
  const f = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const columns = [
    {
      key: 'student', header: 'Student', render: (r: any) => (
        <div><p className="font-medium text-slate-900 text-sm">{r.students?.full_name ?? '—'}</p><p className="text-xs text-slate-400">{r.students?.register_number || r.students?.roll_number}</p></div>
      )
    },
    { key: 'department', header: 'Department', render: (r: any) => <span className="font-semibold text-slate-700 text-xs">{r.departments?.department_name ?? '—'}</span> },
    { key: 'course', header: 'Course', render: (r: any) => <div><p className="text-sm text-slate-800">{r.courses?.course_name ?? r.course_code}</p><code className="text-xs text-slate-400">{r.course_code}</code></div> },
    { key: 'exam_type', header: 'Type', render: (r: any) => <span className="text-xs text-slate-600">{r.exam_type}</span> },
    { key: 'exam_date', header: 'Date', render: (r: any) => <span className="text-xs text-slate-500">{formatDate(r.exam_date)}</span> },
    { key: 'marks', header: 'Marks', render: (r: any) => <span className="font-semibold text-slate-700">{r.marks_obtained ?? '—'}/{r.max_marks}</span> },
    { key: 'grade', header: 'Grade', render: (r: any) => <span className="font-bold text-blue-600">{r.grade ?? '—'}</span> },
    { key: 'result', header: 'Result', render: (r: any) => <Badge color={getStatusColor(r.result ?? '') as any}>{r.result ?? '—'}</Badge> },
    {
      key: 'actions', header: '', width: '80px', render: (r: any) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
          <button onClick={() => setDeleteId(r.exam_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold text-slate-900">Examinations</h1><p className="text-sm text-slate-500">{data?.count ?? '...'} records</p></div>
        <Button icon={<Plus size={15} />} onClick={openAdd}>Add Result</Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]"><Input placeholder="Search by student..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={<Search size={14} />} /></div>
        <Select options={(courses ?? []).map((c: any) => ({ value: c.course_code, label: `${c.course_name} (${c.course_code})` }))} value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }} placeholder="All Courses" className="min-w-[200px]" />
        <Select options={[{ value: 'Pass', label: 'Pass' }, { value: 'Fail', label: 'Fail' }]} value={resultFilter} onChange={(e) => { setResultFilter(e.target.value); setPage(1); }} placeholder="All Results" className="min-w-[130px]" />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <DataTable columns={columns as any} data={data?.data ?? []} keyField="exam_id" isLoading={isLoading}
          emptyMessage="No exam records" emptyIcon={<Award size={36} />}
          currentPage={page} totalPages={totalPages} onPageChange={setPage} totalCount={data?.count} pageSize={PAGE_SIZE} />
      </div>

      {/* Grade distribution chart */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-slate-700">Grade Distribution Chart</p>
          <Select options={(courses ?? []).map((c: any) => ({ value: c.course_code, label: `${c.course_name} (${c.course_code})` }))}
            value={chartCourse} onChange={(e) => setChartCourse(e.target.value)} placeholder="Select a course..." className="min-w-[250px]" />
        </div>
        <GradeDistributionChart courseCode={chartCourse} />
      </div>

      {/* Add / Edit modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Result' : 'Add Exam Result'} size="md"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Submit'}</Button></>}>
        <div className="grid grid-cols-2 gap-4">

          {/* When adding: cascading dept → section → student picker */}
          {!editItem ? (
            <CascadePicker
              deptId={formDept} section={formSection} studentId={form.student_id}
              onDept={setFormDept} onSection={setFormSection}
              onStudent={(v) => f('student_id', v)}
            />
          ) : (
            /* When editing: show the existing student as a simple read-only select */
            <div className="col-span-2">
              <Select label="Student" value={form.student_id} onChange={(e) => f('student_id', e.target.value)}
                options={(allStudents ?? []).map((s: any) => ({ value: s.student_id, label: `${s.full_name} (${s.roll_number})` }))}
                placeholder="Select student" required />
            </div>
          )}

          <Select label="Course" value={form.course_code} onChange={(e) => f('course_code', e.target.value)}
            options={(courses ?? []).map((c: any) => ({ value: c.course_code, label: c.course_name }))} placeholder="Select course" required />
          <Select label="Exam Type" value={form.exam_type} onChange={(e) => f('exam_type', e.target.value)} options={EXAM_TYPES.map((t) => ({ value: t, label: t }))} />
          <Input label="Exam Date" type="date" value={form.exam_date} onChange={(e) => f('exam_date', e.target.value)} />
          <Input label="Marks Obtained" type="number" value={form.marks_obtained} onChange={(e) => f('marks_obtained', e.target.value)} required />
          <Input label="Max Marks" type="number" value={form.max_marks} onChange={(e) => f('max_marks', e.target.value)} />
          <Select label="Grade" value={form.grade} onChange={(e) => f('grade', e.target.value)} options={GRADES.map((g) => ({ value: g, label: g }))} placeholder="Select grade" />
          <Select label="Result" value={form.result} onChange={(e) => f('result', e.target.value)} options={[{ value: 'Pass', label: 'Pass' }, { value: 'Fail', label: 'Fail' }]} />
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Result" message="Delete this exam record?" isLoading={deleteMutation.isPending} />
    </div>
  );
}
