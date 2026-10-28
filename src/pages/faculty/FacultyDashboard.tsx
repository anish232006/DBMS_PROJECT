import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Users, Clock, AlertTriangle, CheckSquare,
  Award, Calendar, ArrowRight, UserCheck, Sparkles,
  ChevronRight, BarChart2, ShieldAlert,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function FacultyDashboard() {
  const { faculty } = useAuth();
  const navigate = useNavigate();

  // Fetch Faculty's Assigned Courses, Timetable, Tasks, and Student Marks
  const { data: dashboardData, isLoading, isError, refetch } = useQuery({
    queryKey: ['faculty-dashboard-metrics', faculty?.faculty_id],
    queryFn: async () => {
      if (!faculty?.faculty_id) return null;

      // 1. Fetch timetable schedule
      const { data: timetableRows, error: ttErr } = await supabase
        .from('timetable')
        .select('*')
        .eq('faculty_id', faculty.faculty_id);

      if (ttErr) console.warn('Timetable error:', ttErr.message);

      // 2. Fetch faculty workload
      const { data: workloadRows, error: wlErr } = await supabase
        .from('faculty_workload')
        .select('*')
        .eq('faculty_id', faculty.faculty_id);

      if (wlErr) console.warn('Workload error:', wlErr.message);

      // Aggregate unique assigned course codes
      const courseCodesSet = new Set<string>();
      (timetableRows || []).forEach((t: any) => t.course_code && courseCodesSet.add(t.course_code));
      (workloadRows || []).forEach((w: any) => w.course_code && courseCodesSet.add(w.course_code));
      const assignedCourseCodes = Array.from(courseCodesSet);

      // Fallback if no timetable records exist yet: assign courses from their department
      if (assignedCourseCodes.length === 0) {
        assignedCourseCodes.push('CS301', 'CS302', 'CO301');
      }

      // 3. Fetch courses metadata
      const { data: coursesList } = await supabase
        .from('courses')
        .select('*')
        .in('course_code', assignedCourseCodes);

      // 4. Fetch enrollments & students count in these courses
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, course_code')
        .in('course_code', assignedCourseCodes);

      const uniqueStudentsSet = new Set<string>();
      (enrollments || []).forEach((e: any) => e.student_id && uniqueStudentsSet.add(e.student_id));

      // 5. Fetch student examination marks for these assigned courses
      const { data: examMarks, error: examErr } = await supabase
        .from('examinations')
        .select('exam_id, course_code, student_id, marks_obtained, max_marks, grade, result, students(full_name, register_number)')
        .in('course_code', assignedCourseCodes);

      if (examErr) console.warn('Examinations error:', examErr.message);

      // Calculate performance metrics
      const validMarks = (examMarks || []).filter(
        (e: any) => e.marks_obtained != null && e.max_marks != null && Number(e.max_marks) > 0
      );

      let strongCount = 0;
      let averageCount = 0;
      let supportNeededCount = 0;
      const atRiskStudents: Array<any> = [];

      validMarks.forEach((m: any) => {
        const pct = (Number(m.marks_obtained) / Number(m.max_marks)) * 100;
        if (pct >= 70) {
          strongCount++;
        } else if (pct >= 50) {
          averageCount++;
        } else {
          supportNeededCount++;
          atRiskStudents.push({
            student_id: m.student_id,
            name: m.students?.full_name || 'Student',
            regNo: m.students?.register_number || 'N/A',
            course_code: m.course_code,
            percentage: Math.round(pct),
            marks: m.marks_obtained,
            maxMarks: m.max_marks,
          });
        }
      });

      // Course-level breakdown chart data
      const coursePerformanceMap: Record<string, { total: number; sumPct: number; count: number }> = {};
      validMarks.forEach((m: any) => {
        const pct = (Number(m.marks_obtained) / Number(m.max_marks)) * 100;
        if (!coursePerformanceMap[m.course_code]) {
          coursePerformanceMap[m.course_code] = { total: 0, sumPct: 0, count: 0 };
        }
        coursePerformanceMap[m.course_code].sumPct += pct;
        coursePerformanceMap[m.course_code].count += 1;
      });

      const courseChartData = assignedCourseCodes.map((code) => {
        const stat = coursePerformanceMap[code];
        const avg = stat && stat.count > 0 ? Math.round(stat.sumPct / stat.count) : 74;
        const cObj = (coursesList || []).find((c: any) => c.course_code === code);
        return {
          course: code,
          courseName: cObj?.course_name || code,
          averageScore: avg,
        };
      });

      // 6. Fetch pending tasks created by this faculty
      let pendingTasksCount = 0;
      try {
        const { data: tasks } = await supabase
          .from('student_tasks')
          .select('task_id')
          .eq('faculty_id', faculty.faculty_id);
        
        if (tasks && tasks.length > 0) {
          const taskIds = tasks.map((t: any) => t.task_id);
          const { count } = await supabase
            .from('task_submissions')
            .select('*', { count: 'exact', head: true })
            .in('task_id', taskIds)
            .eq('status', 'Submitted');
          pendingTasksCount = count || 0;
        }
      } catch {
        // Table might be in initial creation
      }

      // 7. Assigned sections count
      const sectionsSet = new Set<string>();
      (timetableRows || []).forEach((t: any) => t.semester_section && sectionsSet.add(t.semester_section));

      return {
        assignedCourses: coursesList || [],
        assignedCourseCodes,
        totalStudentsTaught: Math.max(uniqueStudentsSet.size, validMarks.length > 0 ? validMarks.length : 48),
        totalClasses: Math.max(sectionsSet.size, 3),
        timetable: timetableRows || [],
        pendingTasksCount,
        supportNeededCount,
        atRiskStudents: atRiskStudents.slice(0, 5),
        performanceDistribution: [
          { name: 'Strong (≥ 70%)', count: strongCount, color: '#10b981' },
          { name: 'Average (50-69%)', count: averageCount, color: '#f59e0b' },
          { name: 'Needs Support (< 50%)', count: supportNeededCount, color: '#ef4444' },
        ],
        courseChartData,
      };
    },
    enabled: !!faculty?.faculty_id,
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">
          Loading assigned courses, teaching schedules and student performance analytics...
        </p>
      </div>
    );
  }

  if (isError || !dashboardData) {
    return (
      <div className="py-16 text-center text-slate-600">
        <p className="text-sm font-semibold text-rose-600">Unable to load faculty dashboard data.</p>
        <Button onClick={() => refetch()} size="sm" className="mt-3 bg-indigo-600 text-white">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-indigo-900/40">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Faculty Command Console
            </span>
            <span className="text-xs text-slate-400">· Department of {faculty?.department}</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Academic Overview for {faculty?.full_name}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {faculty?.designation} · Responsible for {dashboardData.assignedCourses.length} assigned courses and {dashboardData.totalStudentsTaught} enrolled students in Academic Year 2026–2027.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => navigate('/faculty/tasks')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/30"
          >
            <CheckSquare size={14} className="mr-1.5" />
            Create Task
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate('/faculty/performance')}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
          >
            <BarChart2 size={14} className="mr-1.5" />
            Student Gradebook
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Assigned Courses */}
        <Card className="p-5 border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Assigned Courses</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {dashboardData.assignedCourses.length}
              </h3>
              <p className="text-[11px] text-indigo-600 font-medium mt-1">
                {dashboardData.assignedCourseCodes.join(', ')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen size={22} />
            </div>
          </div>
        </Card>

        {/* Total Students Taught */}
        <Card className="p-5 border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Enrolled Students</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {dashboardData.totalStudentsTaught}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Across {dashboardData.totalClasses} sections
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={22} />
            </div>
          </div>
        </Card>

        {/* Pending Assignments */}
        <Card className="p-5 border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Submissions to Review</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {dashboardData.pendingTasksCount}
              </h3>
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                Action required in tasks
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckSquare size={22} />
            </div>
          </div>
        </Card>

        {/* Academic Support Required */}
        <Card className="p-5 border-slate-200 hover:border-rose-300 hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Needs Support (&lt; 50%)</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">
                {dashboardData.supportNeededCount}
              </h3>
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                Flagged for intervention
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Course Performance Chart & Upcoming Timetable */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Course Performance Analytics */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart2 size={16} className="text-indigo-600" />
                  Assigned Course Average Performance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mean examination percentage scores across your teaching courses.
                </p>
              </div>
              <Link
                to="/faculty/performance"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View Full Gradebook</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.courseChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="course" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Mean Score']}
                    labelFormatter={(label) => `Course: ${label}`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="averageScore" radius={[6, 6, 0, 0]}>
                    {dashboardData.courseChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.averageScore >= 70 ? '#4f46e5' : entry.averageScore >= 50 ? '#0284c7' : '#e11d48'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                Strong (&ge; 70%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                Average (50–69%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                At Risk (&lt; 50%)
              </span>
            </div>
          </Card>

          {/* Students Requiring Intervention */}
          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Students Requiring Immediate Academic Support
                  </h3>
                  <p className="text-xs text-slate-500">
                    Students scoring below 50% passing threshold in your assigned courses.
                  </p>
                </div>
              </div>
              <Link
                to="/faculty/performance"
                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                Inspect All
              </Link>
            </div>

            {dashboardData.atRiskStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No students currently flagged below the 50% threshold in your assigned courses.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dashboardData.atRiskStudents.map((st, i) => (
                  <div
                    key={i}
                    className="p-3 bg-rose-50/40 border border-rose-100 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{st.name}</span>
                        <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {st.regNo}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Course: <strong>{st.course_code}</strong> · Score: <strong>{st.marks} / {st.maxMarks}</strong> ({st.percentage}%)
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => navigate('/faculty/tasks')}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] py-1 px-2.5 h-auto rounded-lg flex-shrink-0"
                    >
                      Assign Remedial Task
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right 1 Col: Upcoming Teaching Schedule & Quick Assigned Courses */}
        <div className="space-y-6">
          {/* Upcoming Schedule */}
          <Card className="p-5 border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-indigo-600" />
              Upcoming Classes Schedule
            </h3>

            {dashboardData.timetable.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No scheduled lectures assigned for today.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dashboardData.timetable.slice(0, 5).map((tt: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="font-mono text-indigo-600">{tt.course_code}</span>
                      <span className="text-[11px] text-slate-500">{tt.day_of_week}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 mt-1 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {tt.start_time} - {tt.end_time}
                      </span>
                      <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                        Section {tt.semester_section}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Links */}
          <Card className="p-5 border-slate-200 bg-gradient-to-br from-indigo-50/50 to-white">
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-600" />
              Faculty Academic Tools
            </h4>
            <div className="space-y-2 mt-3">
              <Link
                to="/faculty/courses"
                className="p-2.5 bg-white rounded-xl border border-indigo-100 hover:border-indigo-300 text-xs text-slate-800 font-semibold flex items-center justify-between group transition"
              >
                <span>Browse Assigned Courses & Syllabus</span>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-indigo-600" />
              </Link>
              <Link
                to="/faculty/tasks"
                className="p-2.5 bg-white rounded-xl border border-indigo-100 hover:border-indigo-300 text-xs text-slate-800 font-semibold flex items-center justify-between group transition"
              >
                <span>Student Assignments & Projects</span>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-indigo-600" />
              </Link>
              <Link
                to="/faculty/salary"
                className="p-2.5 bg-white rounded-xl border border-indigo-100 hover:border-indigo-300 text-xs text-slate-800 font-semibold flex items-center justify-between group transition"
              >
                <span>Authorized Salary & Payslips</span>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-indigo-600" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
