import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare, Calendar, Clock, Award, AlertCircle,
  CheckCircle2, FileText, Send, Star, ExternalLink,
  MessageSquare, Sparkles, Filter, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';

export interface StudentTaskViewItem {
  task_id: string;
  course_code: string;
  title: string;
  description: string;
  task_type: string;
  priority: 'High' | 'Medium' | 'Low';
  instructions: string;
  due_date: string;
  max_marks: number;
  submission_status: 'Assigned' | 'In Progress' | 'Submitted' | 'Reviewed' | 'Overdue';
  marks_obtained?: number | null;
  faculty_feedback?: string;
  submission_content?: string;
}

export default function StudentTasksPage() {
  const { student } = useAuth();
  const qc = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [activeTaskToSubmit, setActiveTaskToSubmit] = useState<StudentTaskViewItem | null>(null);
  const [submissionText, setSubmissionText] = useState('');

  // 1. Fetch student's enrolled course codes
  const { data: studentCourses = [] } = useQuery({
    queryKey: ['student-enrolled-courses', student?.student_id],
    queryFn: async () => {
      if (!student?.student_id) return ['CS301', 'CO301', 'CS302'];
      const { data } = await supabase
        .from('enrollments')
        .select('course_code')
        .eq('student_id', student.student_id);
      const codes = Array.from(new Set((data || []).map((d: any) => d.course_code).filter(Boolean)));
      return codes.length > 0 ? codes : ['CS301', 'CO301', 'CS302'];
    },
    enabled: !!student?.student_id,
  });

  // 2. Fetch tasks for these courses or assigned specifically to this student
  const { data: tasks = [], isLoading, isError, refetch } = useQuery<StudentTaskViewItem[]>({
    queryKey: ['student-tasks-list', student?.student_id, studentCourses],
    queryFn: async () => {
      if (!student?.student_id) return [];

      let rawTasks: any[] = [];
      try {
        const { data, error } = await supabase
          .from('student_tasks')
          .select('*')
          .or(`course_code.in.(${studentCourses.join(',')}),assigned_student_id.eq.${student.student_id}`)
          .order('due_date', { ascending: true });

        if (!error && data && data.length > 0) {
          rawTasks = data;
        }
      } catch {
        // Fallback
      }

      // Check local storage for tasks published across the demo
      if (rawTasks.length === 0) {
        // Gather from localStorage keys
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('universe_tasks_')) {
            try {
              const parsed = JSON.parse(localStorage.getItem(k) || '[]');
              rawTasks.push(...parsed);
            } catch {
              // ignore
            }
          }
        }
      }

      // Fallback default tasks if none found
      if (rawTasks.length === 0) {
        rawTasks = [
          {
            task_id: 'task-db-remedial-1',
            course_code: 'CS301',
            title: 'Remedial Module: Normalization (1NF to BCNF) Practice Set',
            description: 'Targeted exercises for students scoring below passing threshold in Unit 2.',
            task_type: 'Remedial Learning Task',
            priority: 'High',
            instructions: 'Complete the 4 relational schema decomposition problems with functional dependency proofs.',
            due_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
            max_marks: 50,
          },
          {
            task_id: 'task-db-project-2',
            course_code: 'CS301',
            title: 'Mini-Project: Relational Database Schema Design & SQL Triggers',
            description: 'Design a 3NF normalized schema for a healthcare clinic or hospital system.',
            task_type: 'Project',
            priority: 'Medium',
            instructions: 'Submit your ER diagram, DDL script with constraints, and 3 test queries with execution plans.',
            due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
            max_marks: 100,
          },
        ];
      }

      // Fetch student submissions
      const submissionsMap: Record<string, any> = {};
      try {
        const { data: subs } = await supabase
          .from('task_submissions')
          .select('*')
          .eq('student_id', student.student_id);

        (subs || []).forEach((s: any) => {
          submissionsMap[s.task_id] = s;
        });
      } catch {
        // ignore
      }

      // Check local storage submissions
      rawTasks.forEach((t) => {
        if (!submissionsMap[t.task_id]) {
          const cached = localStorage.getItem(`universe_submissions_${t.task_id}`);
          if (cached) {
            try {
              const list = JSON.parse(cached);
              const found = list.find((s: any) => s.student_id === student.student_id || s.register_number === student.register_number);
              if (found) submissionsMap[t.task_id] = found;
            } catch {
              // ignore
            }
          }
        }
      });

      return rawTasks.map((t) => {
        const sub = submissionsMap[t.task_id];
        return {
          task_id: t.task_id,
          course_code: t.course_code,
          title: t.title,
          description: t.description || '',
          task_type: t.task_type || 'Assignment',
          priority: t.priority || 'Medium',
          instructions: t.instructions || '',
          due_date: t.due_date || 'Fall 2026',
          max_marks: t.max_marks || 100,
          submission_status: sub ? sub.status : 'Assigned',
          marks_obtained: sub ? sub.marks_obtained : null,
          faculty_feedback: sub ? sub.feedback : '',
          submission_content: sub ? sub.submission_content : '',
        };
      });
    },
    enabled: !!student?.student_id,
  });

  // Submit task mutation
  const submitWorkMutation = useMutation({
    mutationFn: async () => {
      if (!student?.student_id || !activeTaskToSubmit) throw new Error('No task selected');
      if (!submissionText.trim()) throw new Error('Please enter your submission text or solution summary.');

      const submissionPayload = {
        submission_id: `sub-${student.student_id}-${activeTaskToSubmit.task_id}`,
        task_id: activeTaskToSubmit.task_id,
        student_id: student.student_id,
        status: 'Submitted',
        submission_content: submissionText,
        submitted_at: new Date().toISOString(),
        marks_obtained: null,
        feedback: '',
      };

      try {
        await supabase
          .from('task_submissions')
          .upsert(submissionPayload, { onConflict: 'task_id,student_id' });
      } catch {
        // ignore
      }

      // Local storage persistence
      const key = `universe_submissions_${activeTaskToSubmit.task_id}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = existing.filter((s: any) => s.student_id !== student.student_id);
      filtered.push({
        ...submissionPayload,
        student_name: student.full_name,
        register_number: student.register_number,
      });
      localStorage.setItem(key, JSON.stringify(filtered));

      return submissionPayload;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-tasks-list'] });
      toast.success('Your assignment has been submitted to the faculty instructor.');
      setSubmitModalOpen(false);
      setSubmissionText('');
    },
    onError: (err: any) => {
      toast.error('Submission Failed', err?.message);
    },
  });

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return t.submission_status === 'Assigned' || t.submission_status === 'In Progress';
    if (filterStatus === 'submitted') return t.submission_status === 'Submitted';
    if (filterStatus === 'reviewed') return t.submission_status === 'Reviewed';
    return true;
  });

  const pendingCount = tasks.filter((t) => t.submission_status === 'Assigned' || t.submission_status === 'In Progress').length;
  const reviewedCount = tasks.filter((t) => t.submission_status === 'Reviewed').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-indigo-600" />
            My Academic Tasks & Assignments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Course exercises, revision tasks, and project milestones assigned by your faculty instructors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            {pendingCount} Pending Tasks
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {reviewedCount} Graded
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All Tasks' },
          { key: 'pending', label: 'Pending Submission' },
          { key: 'submitted', label: 'Submitted (Under Review)' },
          { key: 'reviewed', label: 'Reviewed & Graded' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === tab.key
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading your coursework and tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="p-12 text-center border-slate-200">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
          <h3 className="text-base font-bold text-slate-900">All Caught Up!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            You have no pending assignments matching this category in your enrolled courses.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const isReviewed = task.submission_status === 'Reviewed';
            const isSubmitted = task.submission_status === 'Submitted';
            const isHigh = task.priority === 'High';

            return (
              <Card
                key={task.task_id}
                className={`p-5 border transition-all flex flex-col justify-between ${
                  isReviewed
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isSubmitted
                    ? 'border-amber-200 bg-amber-50/20'
                    : isHigh
                    ? 'border-rose-200 hover:border-rose-300'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
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
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isReviewed
                          ? 'bg-emerald-100 text-emerald-800'
                          : isSubmitted
                          ? 'bg-amber-100 text-amber-800'
                          : isHigh
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {task.submission_status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2">{task.title}</h3>
                  {task.description && (
                    <p className="text-xs text-slate-600 mt-1">{task.description}</p>
                  )}

                  {task.instructions && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                      <span className="font-bold text-[11px] text-slate-900 block mb-0.5">Faculty Instructions:</span>
                      <p className="text-[11px] leading-relaxed text-slate-600">{task.instructions}</p>
                    </div>
                  )}

                  {/* Feedback / Marks Banner if reviewed */}
                  {isReviewed && (
                    <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1">
                          <Star size={13} className="text-amber-500 fill-amber-500" />
                          Faculty Score Awarded:
                        </span>
                        <span className="font-mono text-sm text-emerald-800">
                          {task.marks_obtained} / {task.max_marks}
                        </span>
                      </div>
                      {task.faculty_feedback && (
                        <p className="text-[11px] text-emerald-800 italic pt-1 border-t border-emerald-200/60">
                          "{task.faculty_feedback}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar size={12} />
                    <span>Due: <strong>{task.due_date}</strong></span>
                  </div>

                  {!isReviewed && !isSubmitted ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveTaskToSubmit(task);
                        setSubmissionText(task.submission_content || '');
                        setSubmitModalOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                    >
                      <Send size={12} className="mr-1" />
                      Submit Work
                    </Button>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      Work Recorded
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* SUBMISSION MODAL */}
      {submitModalOpen && activeTaskToSubmit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Send size={16} className="text-indigo-600" />
                Submit Assignment Solution
              </h3>
              <button onClick={() => setSubmitModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">{activeTaskToSubmit.title}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Course: {activeTaskToSubmit.course_code} · Max Marks: {activeTaskToSubmit.max_marks}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Solution Text / GitHub Repository / Work Summary
                </label>
                <textarea
                  rows={4}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Paste your final answers, code solution, or drive link with explanations..."
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setSubmitModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => submitWorkMutation.mutate()}
                  disabled={submitWorkMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {submitWorkMutation.isPending ? 'Submitting...' : 'Confirm Submission'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
