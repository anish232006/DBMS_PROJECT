import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function TimetableGrid({ data }: { data: any[] }) {
  // Build lookup: grid[day][startTime] = slots[]
  const grid: Record<string, Record<string, any[]>> = {};
  DAYS.forEach((d) => { grid[d] = {}; });

  // Collect distinct start times present in the actual data
  const timeSet = new Set<string>();

  data.forEach((slot) => {
    const day = slot.day_of_week;
    // Normalise to "HH:MM" regardless of whether DB returns "HH:MM" or "HH:MM:SS"
    const time = (slot.start_time ?? '').slice(0, 5);
    if (!time) return;
    timeSet.add(time);
    if (!grid[day]) grid[day] = {};
    if (!grid[day][time]) grid[day][time] = [];
    grid[day][time].push(slot);
  });

  // Sort time rows chronologically
  const timeRows = Array.from(timeSet).sort();

  // If no data yet, show a placeholder message
  if (timeRows.length === 0) {
    return (
      <p className="text-slate-400 text-sm text-center py-16">
        No timetable slots yet. Add a slot to see the grid.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="w-20 p-2 text-left text-slate-500 font-semibold border-b border-slate-100 whitespace-nowrap">
              Time
            </th>
            {DAYS.map((d) => (
              <th key={d} className="p-2 text-left font-semibold text-slate-700 border-b border-slate-100 min-w-[140px]">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeRows.map((time) => (
            <tr key={time} className="border-b border-slate-50">
              {/* Time label */}
              <td className="p-2 text-slate-400 font-mono text-[11px] whitespace-nowrap align-top pt-3">
                {time}
              </td>
              {/* One cell per day */}
              {DAYS.map((day) => {
                const slots = grid[day]?.[time] ?? [];
                return (
                  <td key={day} className="p-1.5 align-top">
                    {slots.map((slot: any) => (
                      <div
                        key={slot.timetable_id}
                        className="bg-blue-50 border border-blue-100 rounded-lg p-2 mb-1 hover:bg-blue-100 transition-colors"
                      >
                        <p className="font-semibold text-blue-800 leading-tight truncate">
                          {slot.courses?.course_name ?? slot.course_code}
                        </p>
                        <p className="text-blue-600 truncate mt-0.5">
                          {slot.faculty?.full_name ?? '—'}
                        </p>
                        <p className="text-blue-400">
                          {slot.classrooms?.room_number ?? '—'} · {(slot.start_time ?? '').slice(0, 5)}–{(slot.end_time ?? '').slice(0, 5)}
                        </p>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TimetablePage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [deptFilter, setDeptFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ department_id: '', course_code: '', faculty_id: '', classroom_id: '', day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', semester_section: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timetable')
        .select('*, courses(course_name), faculty(full_name), classrooms(room_number), departments(department_name)')
        .order('department_id').order('day_of_week').order('start_time');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['departments-select'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('department_id, department_name').order('department_name');
      return data ?? [];
    },
  });

  const { data: courses } = useQuery({ queryKey: ['courses-select'], queryFn: async () => { const { data } = await supabase.from('courses').select('course_code, course_name').order('course_name'); return data ?? []; } });
  const { data: faculty } = useQuery({ queryKey: ['faculty-list-simple'], queryFn: async () => { const { data } = await supabase.from('faculty').select('faculty_id, full_name').eq('status', 'active').order('full_name'); return data ?? []; } });
  const { data: classrooms } = useQuery({ queryKey: ['classrooms-select'], queryFn: async () => { const { data } = await supabase.from('classrooms').select('classroom_id, room_number, building').order('room_number'); return data ?? []; } });

  const displayedData = (data ?? []).filter((s: any) => {
    if (deptFilter && s.department_id !== deptFilter) return false;
    return true;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editItem) {
        const { error } = await supabase.from('timetable').update(form).eq('timetable_id', editItem.timetable_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('timetable').insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timetable'] }); toast.success(editItem ? 'Updated' : 'Slot added'); setModalOpen(false); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('timetable').delete().eq('timetable_id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timetable'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e: any) => toast.error('Failed', e.message),
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ department_id: item.department_id ?? '', course_code: item.course_code, faculty_id: item.faculty_id, classroom_id: item.classroom_id, day_of_week: item.day_of_week, start_time: item.start_time?.slice(0,5) ?? '09:00', end_time: item.end_time?.slice(0,5) ?? '10:00', semester_section: item.semester_section ?? '' });
    setModalOpen(true);
  };
  const f = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const listColumns = [
    { key: 'department', header: 'Department', render: (r: any) => <span className="font-semibold text-slate-700 text-xs">{r.departments?.department_name ?? '—'}</span> },
    { key: 'course', header: 'Course', render: (r: any) => <span className="font-medium text-slate-900">{r.courses?.course_name ?? r.course_code}</span> },
    { key: 'faculty', header: 'Faculty', render: (r: any) => <span className="text-slate-700">{r.faculty?.full_name ?? '—'}</span> },
    { key: 'day_of_week', header: 'Day', render: (r: any) => <span className="text-slate-700">{r.day_of_week}</span> },
    { key: 'time', header: 'Time', render: (r: any) => <span className="font-mono text-sm text-slate-700">{r.start_time?.slice(0,5)} – {r.end_time?.slice(0,5)}</span> },
    { key: 'classroom', header: 'Room', render: (r: any) => <span className="text-slate-600">{r.classrooms?.room_number ?? '—'}</span> },
    { key: 'semester_section', header: 'Section', render: (r: any) => <span className="text-slate-500 text-xs">{r.semester_section}</span> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
        <button onClick={() => setDeleteId(r.timetable_id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Academic Timetable</h1>
          <p className="text-sm text-slate-500">{displayedData.length} scheduled slots</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {(departments ?? []).map((d: any) => (
              <option key={d.department_id} value={d.department_id}>
                {d.department_name}
              </option>
            ))}
          </select>
          <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1">
            <button onClick={() => setView('grid')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Grid</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>List</button>
          </div>
          <Button icon={<Plus size={15} />} onClick={() => { setEditItem(null); setForm({ department_id: '', course_code: '', faculty_id: '', classroom_id: '', day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', semester_section: '' }); setModalOpen(true); }}>Add Slot</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        {isLoading
          ? <div className="skeleton h-80 rounded-lg" />
          : view === 'grid'
            ? <TimetableGrid data={displayedData} />
            : <DataTable columns={listColumns as any} data={displayedData} keyField="timetable_id" emptyMessage="No timetable entries" emptyIcon={<Calendar size={36} />} />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Slot' : 'Add Timetable Slot'} size="md"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>{editItem ? 'Save' : 'Add'}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Select label="Department" value={form.department_id} onChange={(e) => f('department_id', e.target.value)}
              options={(departments ?? []).map((d: any) => ({ value: d.department_id, label: d.department_name }))} placeholder="Select department" required />
          </div>
          <Select label="Course" value={form.course_code} onChange={(e) => f('course_code', e.target.value)}
            options={(courses ?? []).map((c: any) => ({ value: c.course_code, label: `${c.course_name} (${c.course_code})` }))} placeholder="Select course" required />
          <Select label="Faculty" value={form.faculty_id} onChange={(e) => f('faculty_id', e.target.value)}
            options={(faculty ?? []).map((f: any) => ({ value: f.faculty_id, label: f.full_name }))} placeholder="Select faculty" required />
          <Select label="Classroom" value={form.classroom_id} onChange={(e) => f('classroom_id', e.target.value)}
            options={(classrooms ?? []).map((c: any) => ({ value: c.classroom_id, label: `${c.room_number} (${c.building})` }))} placeholder="Select room" />
          <Select label="Day" value={form.day_of_week} onChange={(e) => f('day_of_week', e.target.value)}
            options={DAYS.map((d) => ({ value: d, label: d }))} />
          <Input label="Start Time" type="time" value={form.start_time} onChange={(e) => f('start_time', e.target.value)} />
          <Input label="End Time" type="time" value={form.end_time} onChange={(e) => f('end_time', e.target.value)} />
          <div className="col-span-2">
            <Input label="Semester Section" value={form.semester_section} onChange={(e) => f('semester_section', e.target.value)} placeholder="e.g. 3-A" />
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="Delete Slot" message="Remove this timetable slot?" isLoading={deleteMutation.isPending} />
    </div>
  );
}
