import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare, Plus, Trash2, Edit2, Search,
  Calendar, Clock, Award, AlertCircle, CheckCircle2,
  Users, User, FileText, ChevronRight, X, ExternalLink,
  MessageSquare, Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';

export interface TaskItem {
  task_id: string;
  faculty_id: string;
  course_code: string;
  title: string;
  description: string;
  task_type: string;
  priority: 'High' | 'Medium' | 'Low';
  instructions: string;
  assigned_scope: 'Course' | 'Individual Student';
  assigned_student_id?: string | null;
  due_date: string;
  max_marks: number;
  created_at: string;
}

export interface SubmissionItem {
  submission_id: string;
  task_id: string;
  student_id: string;
  student_name?: string;
  register_number?: string;
  status: 'Assigned' | 'In Progress' | 'Submitted' | 'Reviewed' | 'Overdue';
  submission_content?: string;
  file_url?: string;
  submitted_at?: string;
  marks_obtained?: number | null;
  feedback?: string;
}

const TASK_TYPES = [
  'Assignment',
  'Practice Exercise',
  'Revision Task',
  'Project',
  'Reading Task',
  'Remedial Learning Task',
  'Quiz Preparation',
];

export default function FacultyTasksPage() {
  const { faculty } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'tasks' | 'submissions'>('tasks');
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [selectedTaskForSubmissions, setSelectedTaskForSubmissions] = useState<TaskItem | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);

  // Review Form States
  const [reviewMarks, setReviewMarks] = useState<number>(85);
  const [reviewFeedback, setReviewFeedback] = useState('');

  // Form states
  const [formCourse, setFormCourse] = useState('CS301');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('Assignment');
  const [formPriority, setFormPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [formMaxMarks, setFormMaxMarks] = useState(100);
  const [formScope, setFormScope] = useState<'Course' | 'Individual Student'>('Course');
  const [formStudentId, setFormStudentId] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // 1. Fetch assigned courses
  const { data: assignedCourses } = useQuery({
    queryKey: ['faculty-tasks-assigned-courses', faculty?.faculty_id],
    queryFn: async () => {
      if (!faculty?.faculty_id) return ['CS301', 'CS302', 'CO301'];
      const { data: tt } = await supabase.from('timetable').select('course_code').eq('faculty_id', faculty.faculty_id);
      const codes = Array.from(new Set((tt || []).map((t: any) => t.course_code).filter(Boolean)));
      return codes.length > 0 ? codes : ['CS301', 'CS302', 'CO301'];
    },
    enabled: !!faculty?.faculty_id,
  });

  // 2. Fetch tasks created by this faculty
  const { data: tasksList = [], isLoading: loadingTasks } = useQuery<TaskItem[]>({
    queryKey: ['faculty-tasks', faculty?.faculty_id],
    queryFn: async () => {
      if (!faculty?.faculty_id) return [];

      try {
        const { data, error } = await supabase
          .from('student_tasks')
          .select('*')
          .eq('faculty_id', faculty.faculty_id)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as TaskItem[];
        }
      } catch {
        // Fallback to local storage persistence
      }

      const cached = localStorage.getItem(`universe_tasks_${faculty.faculty_id}`);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore
        }
      }

      // Initial default sample tasks for demonstration
      const initial: TaskItem[] = [
        {
          task_id: 'task-db-remedial-1',
          faculty_id: faculty.faculty_id,
          course_code: 'CS301',
          title: 'Remedial Module: Normalization (1NF to BCNF) Practice Set',
          description: 'Targeted exercises for students scoring below passing threshold in Unit 2.',
          task_type: 'Remedial Learning Task',
          priority: 'High',
          instructions: 'Complete the 4 relational schema decomposition problems with functional dependency proofs.',
          assigned_scope: 'Course',
          due_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
          max_marks: 50,
          created_at: new Date().toISOString(),
        },
        {
          task_id: 'task-db-project-2',
          faculty_id: faculty.faculty_id,
          course_code: 'CS301',
          title: 'Mini-Project: Relational Database Schema Design & SQL Triggers',
          description: 'Design a 3NF normalized schema for a healthcare clinic or hospital system.',
          task_type: 'Project',
          priority: 'Medium',
          instructions: 'Submit your ER diagram, DDL script with constraints, and 3 test queries with execution plans.',
          assigned_scope: 'Course',
          due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          max_marks: 100,
          created_at: new Date().toISOString(),
        },
      ];

      localStorage.setItem(`universe_tasks_${faculty.faculty_id}`, JSON.stringify(initial));
      return initial;
    },
    enabled: !!faculty?.faculty_id,
  });

  // 3. Fetch submissions for selected task
  const { data: submissions = [], isLoading: loadingSubmissions } = useQuery<SubmissionItem[]>({
    queryKey: ['task-submissions', selectedTaskForSubmissions?.task_id],
    queryFn: async () => {
      if (!selectedTaskForSubmissions?.task_id) return [];

      try {
        const { data, error } = await supabase
          .from('task_submissions')
          .select('*, students(full_name, register_number)')
          .eq('task_id', selectedTaskForSubmissions.task_id);

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            ...d,
            student_name: d.students?.full_name || 'Enrolled Student',
            register_number: d.students?.register_number || 'N/A',
          }));
        }
      } catch {
        // Fallback
      }

      // Local storage / demo fallback submissions
      const cached = localStorage.getItem(`universe_submissions_${selectedTaskForSubmissions.task_id}`);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore
        }
      }

      const sampleSubmissions: SubmissionItem[] = [
        {
          submission_id: `sub-demo-1`,
          task_id: selectedTaskForSubmissions.task_id,
          student_id: 'ce84737c-1124-4121-b23e-f702b3422431',
          student_name: 'Mohammed Anish R',
          register_number: 'URK24CS1092',
          status: 'Submitted',
          submission_content: 'Attached solution document with decomposition steps for R(A,B,C,D,E) and FDs. Verifying 3NF and BCNF test.',
          file_url: 'https://universe.edu/storage/submissions/URK24CS1092_normalization.pdf',
          submitted_at: new Date(Date.now() - 3600000).toISOString(),
          marks_obtained: null,
          feedback: '',
        },
        {
          submission_id: `sub-demo-2`,
          task_id: selectedTaskForSubmissions.task_id,
          student_id: '290b2497-e180-48f0-a300-692545c80637',
          student_name: 'Aarav Sharma',
          register_number: 'URK23CS3164',
          status: 'Reviewed',
          submission_content: 'Schema decomposition verified. Solved all 4 exercises with dependency preservation proofs.',
          file_url: 'https://universe.edu/storage/submissions/URK23CS3164_answers.pdf',
          submitted_at: new Date(Date.now() - 86400000).toISOString(),
          marks_obtained: 48,
          feedback: 'Excellent rigor and mathematical proofs. Full marks awarded.',
        },
      ];

      localStorage.setItem(`universe_submissions_${selectedTaskForSubmissions.task_id}`, JSON.stringify(sampleSubmissions));
      return sampleSubmissions;
    },
    enabled: !!selectedTaskForSubmissions?.task_id,
  });

  // Save Task (Create or Edit)
  const saveTaskMutation = useMutation({
    mutationFn: async () => {
      if (!faculty?.faculty_id) throw new Error('Unauthenticated');
      if (!formTitle.trim()) throw new Error('Please enter a task title.');

      const newTaskData: TaskItem = {
        task_id: editingTask ? editingTask.task_id : `task-${Date.now()}`,
        faculty_id: faculty.faculty_id,
        course_code: formCourse,
        title: formTitle,
        description: formDescription,
        task_type: formType,
        priority: formPriority,
        instructions: formInstructions,
        assigned_scope: formScope,
        assigned_student_id: formScope === 'Individual Student' ? formStudentId : null,
        due_date: formDueDate,
        max_marks: Number(formMaxMarks) || 100,
        created_at: editingTask ? editingTask.created_at : new Date().toISOString(),
      };

      // 1. Try Supabase
      try {
        if (editingTask) {
          await supabase.from('student_tasks').update(newTaskData).eq('task_id', editingTask.task_id);
        } else {
          await supabase.from('student_tasks').insert(newTaskData);
        }
      } catch {
        // Fall through to local storage persistence
      }

      // 2. Update local storage
      const existing = tasksList.filter((t) => t.task_id !== newTaskData.task_id);
      const updated = [newTaskData, ...existing];
      localStorage.setItem(`universe_tasks_${faculty.faculty_id}`, JSON.stringify(updated));

      return newTaskData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty-tasks'] });
      toast.success(editingTask ? 'Task updated successfully' : 'Task published to students');
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error('Failed to Save Task', err?.message || 'Check database permissions');
    },
  });

  // Delete Task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      try {
        await supabase.from('student_tasks').delete().eq('task_id', taskId);
      } catch {
        // ignore
      }
      const updated = tasksList.filter((t) => t.task_id !== taskId);
      localStorage.setItem(`universe_tasks_${faculty?.faculty_id}`, JSON.stringify(updated));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty-tasks'] });
      toast.success('Task removed');
      if (selectedTaskForSubmissions?.task_id === editingTask?.task_id) {
        setSelectedTaskForSubmissions(null);
      }
    },
  });

  // Grade/Review Submission
  const gradeSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubmission || !selectedTaskForSubmissions) throw new Error('No submission selected');

      const updatedSub: SubmissionItem = {
        ...selectedSubmission,
        marks_obtained: Number(reviewMarks),
        feedback: reviewFeedback,
        status: 'Reviewed',
      };

      try {
        await supabase
          .from('task_submissions')
          .update({
            marks_obtained: Number(reviewMarks),
            feedback: reviewFeedback,
            status: 'Reviewed',
            reviewed_at: new Date().toISOString(),
            reviewed_by: faculty?.faculty_id,
          })
          .eq('submission_id', selectedSubmission.submission_id);
      } catch {
        // ignore
      }

      // Update cached submissions
      const updatedList = submissions.map((s) =>
        s.submission_id === selectedSubmission.submission_id ? updatedSub : s
      );
      localStorage.setItem(`universe_submissions_${selectedTaskForSubmissions.task_id}`, JSON.stringify(updatedList));

      return updatedSub;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-submissions'] });
      toast.success('Grade and feedback recorded successfully');
      setReviewModalOpen(false);
    },
  });

  const resetForm = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormInstructions('');
    setFormType('Assignment');
    setFormPriority('Medium');
    setFormMaxMarks(100);
    setFormScope('Course');
    setFormStudentId('');
  };

  const openCreateModal = () => {
    resetForm();
    if (assignedCourses && assignedCourses.length > 0) {
      setFormCourse(assignedCourses[0]);
    }
    setModalOpen(true);
  };

  const openEditModal = (t: TaskItem) => {
    setEditingTask(t);
    setFormCourse(t.course_code);
    setFormTitle(t.title);
    setFormDescription(t.description || '');
    setFormInstructions(t.instructions || '');
    setFormType(t.task_type);
    setFormPriority(t.priority);
    setFormDueDate(t.due_date || '');
    setFormMaxMarks(t.max_marks || 100);
    setFormScope(t.assigned_scope);
    setFormStudentId(t.assigned_student_id || '');
    setModalOpen(true);
  };

  const openReviewModal = (sub: SubmissionItem) => {
    setSelectedSubmission(sub);
    setReviewMarks(sub.marks_obtained != null ? sub.marks_obtained : 85);
    setReviewFeedback(sub.feedback || 'Good attempt on solving the problems. Verified steps.');
    setReviewModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-indigo-600" />
            Faculty Task & Assignment Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, assign, inspect, and evaluate academic exercises for your assigned university classes.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20"
        >
          <Plus size={15} className="mr-1.5" />
          Create New Task
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-4">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'tasks'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          Active Tasks ({tasksList.length})
        </button>
        <button
          onClick={() => {
            if (tasksList.length > 0 && !selectedTaskForSubmissions) {
              setSelectedTaskForSubmissions(tasksList[0]);
            }
            setActiveTab('submissions');
          }}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'submissions'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          Student Submissions & Grading
        </button>
      </div>

      {/* TAB 1: TASKS LIST */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {tasksList.length === 0 ? (
            <Card className="p-12 text-center border-slate-200">
              <CheckSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-slate-900">No tasks created yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Assign practice exercises, remedial tasks, or project milestones to your students.
              </p>
              <Button onClick={openCreateModal} size="sm" className="mt-4 bg-indigo-600 text-white">
                Create First Task
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasksList.map((task) => {
                const isHigh = task.priority === 'High';
                return (
                  <Card
                    key={task.task_id}
                    className="p-5 border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {task.course_code}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {task.task_type}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isHigh ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.priority} Priority
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mt-2">{task.title}</h3>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                      )}

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          Due: <strong className="text-slate-700">{task.due_date}</strong>
                        </span>
                        <span>Max Marks: <strong className="text-slate-700">{task.max_marks}</strong></span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedTaskForSubmissions(task);
                          setActiveTab('submissions');
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        <Users size={12} className="mr-1" />
                        Submissions
                      </Button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Edit Task"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteTaskMutation.mutate(task.task_id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Task"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBMISSIONS & GRADING */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Select which task to view */}
          <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Active Task:</span>
            <select
              value={selectedTaskForSubmissions?.task_id || ''}
              onChange={(e) => {
                const found = tasksList.find((t) => t.task_id === e.target.value);
                if (found) setSelectedTaskForSubmissions(found);
              }}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
            >
              {tasksList.map((t) => (
                <option key={t.task_id} value={t.task_id}>
                  [{t.course_code}] {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Submissions List */}
          <Card className="border-slate-200 overflow-hidden">
            {submissions.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No submissions received yet for this task.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Submitted On</th>
                      <th className="py-3 px-4">Marks Awarded</th>
                      <th className="py-3 px-4">Feedback Note</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map((sub) => (
                      <tr key={sub.submission_id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>
                            {sub.student_name}
                            <span className="block text-[10px] font-mono font-normal text-slate-400">
                              {sub.register_number}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'Reviewed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'Submitted'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'Pending'}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {sub.marks_obtained != null ? (
                            <span className="text-emerald-700 font-bold">{sub.marks_obtained} / {selectedTaskForSubmissions?.max_marks || 100}</span>
                          ) : (
                            <span className="text-slate-400 italic">Not graded</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">
                          {sub.feedback || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => openReviewModal(sub)}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            {sub.status === 'Reviewed' ? 'Edit Grade' : 'Review & Grade'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* CREATE / EDIT TASK MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-bold text-base text-slate-900">
                {editingTask ? 'Edit Task Assignment' : 'Create New Student Task'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveTaskMutation.mutate();
              }}
              className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Course</label>
                <select
                  value={formCourse}
                  onChange={(e) => setFormCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                >
                  {(assignedCourses || []).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Remedial Exercise: Normalization Decompositions"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Task Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Maximum Marks</label>
                  <input
                    type="number"
                    value={formMaxMarks}
                    onChange={(e) => setFormMaxMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description & Objective</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Summary of assignment purpose and concepts evaluated..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instructions for Students</label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Detailed instructions: show proof steps, submit PDF or GitHub link, etc..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveTaskMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {saveTaskMutation.isPending ? 'Publishing...' : 'Publish Task'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW & GRADE SUBMISSION MODAL */}
      {reviewModalOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Star size={16} className="text-amber-500" />
                Grade Student Submission
              </h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900">{selectedSubmission.student_name}</p>
                <p className="text-[10px] font-mono text-slate-400">{selectedSubmission.register_number}</p>
                {selectedSubmission.submission_content && (
                  <p className="text-slate-600 mt-2 bg-white p-2 rounded border border-slate-200 text-[11px]">
                    "{selectedSubmission.submission_content}"
                  </p>
                )}
                {selectedSubmission.file_url && (
                  <a
                    href={selectedSubmission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-semibold mt-2 hover:underline"
                  >
                    <span>View Submitted Solution File</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Marks Awarded (Max: {selectedTaskForSubmissions?.max_marks || 100})
                </label>
                <input
                  type="number"
                  value={reviewMarks}
                  onChange={(e) => setReviewMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Faculty Feedback & Guidance</label>
                <textarea
                  rows={3}
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder="Provide constructive feedback for student improvement..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setReviewModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => gradeSubmissionMutation.mutate()}
                  disabled={gradeSubmissionMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {gradeSubmissionMutation.isPending ? 'Recording...' : 'Submit Evaluation'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
