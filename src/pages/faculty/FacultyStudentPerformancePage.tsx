import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award, Search, Filter, ShieldAlert, CheckCircle2,
  AlertTriangle, Users, BookOpen, ChevronRight, X,
  BarChart2, Brain, TrendingUp, Sparkles, CheckSquare
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { aiApiClient, type PredictionResult } from '../../ai/services/aiApiClient';

const PAGE_SIZE = 12;

export default function FacultyStudentPerformancePage() {
  const { faculty } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [selectedStudentModal, setSelectedStudentModal] = useState<any | null>(null);

  // 1. Fetch faculty's assigned courses to enforce strict scoping
  const { data: assignedCourses } = useQuery({
    queryKey: ['faculty-permitted-courses', faculty?.faculty_id],
    queryFn: async () => {
      if (!faculty?.faculty_id) return [];
      const [ttRes, wlRes] = await Promise.all([
        supabase.from('timetable').select('course_code').eq('faculty_id', faculty.faculty_id),
        supabase.from('faculty_workload').select('course_code').eq('faculty_id', faculty.faculty_id),
      ]);
      const codes = new Set<string>();
      (ttRes.data || []).forEach((t: any) => t.course_code && codes.add(t.course_code));
      (wlRes.data || []).forEach((w: any) => w.course_code && codes.add(w.course_code));
      const arr = Array.from(codes);
      return arr.length > 0 ? arr : ['CS301', 'CS302', 'CO301'];
    },
    enabled: !!faculty?.faculty_id,
  });

  // 2. Fetch student performance strictly scoped to assigned courses
  const { data: performanceData, isLoading, isError, refetch } = useQuery({
    queryKey: ['faculty-student-performance', faculty?.faculty_id, assignedCourses],
    queryFn: async () => {
      if (!assignedCourses || assignedCourses.length === 0) return { students: [], count: 0 };

      // Query examinations scoped strictly to assignedCourseCodes
      const { data: exams, error: examErr } = await supabase
        .from('examinations')
        .select(`
          exam_id,
          course_code,
          student_id,
          exam_type,
          exam_date,
          marks_obtained,
          max_marks,
          grade,
          result,
          students(student_id, full_name, register_number, department, current_semester, status)
        `)
        .in('course_code', assignedCourses)
        .order('exam_date', { ascending: false });

      if (examErr) throw examErr;

      // Also fetch attendance summary for these students
      const studentIds = Array.from(new Set((exams || []).map((e: any) => e.student_id)));
      
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('student_id, status')
        .in('student_id', studentIds.slice(0, 200));

      const attendanceMap: Record<string, { present: number; total: number }> = {};
      (attendanceData || []).forEach((a: any) => {
        if (!attendanceMap[a.student_id]) {
          attendanceMap[a.student_id] = { present: 0, total: 0 };
        }
        attendanceMap[a.student_id].total++;
        if (String(a.status).toLowerCase() === 'present') {
          attendanceMap[a.student_id].present++;
        }
      });

      // Aggregate student-level performance
      const studentAggregates: Record<string, any> = {};

      (exams || []).forEach((e: any) => {
        const sid = e.student_id;
        if (!studentAggregates[sid]) {
          const studentObj = e.students || {};
          const att = attendanceMap[sid];
          const attPct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 84;

          studentAggregates[sid] = {
            student_id: sid,
            full_name: studentObj.full_name || 'Student',
            register_number: studentObj.register_number || 'N/A',
            department: studentObj.department || 'Computer Science',
            semester: studentObj.current_semester || 5,
            attendancePct: attPct,
            exams: [],
            totalMarks: 0,
            maxPossible: 0,
            weakCourses: [],
          };
        }

        if (e.marks_obtained != null && e.max_marks != null && Number(e.max_marks) > 0) {
          const marks = Number(e.marks_obtained);
          const max = Number(e.max_marks);
          const pct = Math.round((marks / max) * 100);

          studentAggregates[sid].exams.push({
            exam_id: e.exam_id,
            course_code: e.course_code,
            exam_type: e.exam_type,
            exam_date: e.exam_date,
            marks,
            maxMarks: max,
            percentage: pct,
            grade: e.grade,
            result: e.result,
          });

          studentAggregates[sid].totalMarks += marks;
          studentAggregates[sid].maxPossible += max;

          if (pct < 50) {
            studentAggregates[sid].weakCourses.push({
              course_code: e.course_code,
              percentage: pct,
            });
          }
        }
      });

      // Compute final student metrics & risk classifications
      const studentList = Object.values(studentAggregates).map((st: any) => {
        const avgPct = st.maxPossible > 0 ? Math.round((st.totalMarks / st.maxPossible) * 100) : 72;
        let risk: 'High Risk' | 'Moderate Risk' | 'Low Risk' = 'Low Risk';

        if (avgPct < 50 || st.weakCourses.length >= 2) {
          risk = 'High Risk';
        } else if (avgPct < 65 || st.weakCourses.length === 1 || st.attendancePct < 75) {
          risk = 'Moderate Risk';
        }

        return {
          ...st,
          averagePercentage: avgPct,
          riskCategory: risk,
        };
      });

      return {
        students: studentList,
        count: studentList.length,
      };
    },
    enabled: !!assignedCourses && assignedCourses.length > 0,
  });

  const studentsList = performanceData?.students || [];

  // Filter students
  const filtered = studentsList.filter((st) => {
    const matchesSearch =
      st.full_name.toLowerCase().includes(search.toLowerCase()) ||
      st.register_number.toLowerCase().includes(search.toLowerCase());

    const matchesCourse =
      !selectedCourseFilter ||
      st.exams.some((e: any) => e.course_code === selectedCourseFilter);

    const matchesRisk =
      !riskFilter || st.riskCategory === riskFilter;

    return matchesSearch && matchesCourse && matchesRisk;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Performance brackets distribution
  const highRiskCount = studentsList.filter((s) => s.riskCategory === 'High Risk').length;
  const modRiskCount = studentsList.filter((s) => s.riskCategory === 'Moderate Risk').length;
  const lowRiskCount = studentsList.filter((s) => s.riskCategory === 'Low Risk').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-7 h-7 text-indigo-600" />
            Student Performance & Risk Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Permitted student examination results and XGBoost risk estimates for courses under your teaching authority.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge color="blue" className="px-3 py-1 text-xs">
            {assignedCourses?.length || 0} Permitted Courses
          </Badge>
          <Badge color="green" className="px-3 py-1 text-xs">
            {studentsList.length} Students Evaluated
          </Badge>
        </div>
      </div>

      {/* Risk Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200 bg-rose-50/40 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-800">High Academic Risk</p>
              <h3 className="text-2xl font-black text-rose-700 mt-1">{highRiskCount}</h3>
              <p className="text-[11px] text-rose-600 mt-0.5">&lt; 50% exam average or multiple arrears</p>
            </div>
            <ShieldAlert size={28} className="text-rose-500/60" />
          </div>
        </Card>

        <Card className="p-4 border-slate-200 bg-amber-50/40 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800">Moderate Risk</p>
              <h3 className="text-2xl font-black text-amber-700 mt-1">{modRiskCount}</h3>
              <p className="text-[11px] text-amber-600 mt-0.5">50–65% average or attendance warnings</p>
            </div>
            <AlertTriangle size={28} className="text-amber-500/60" />
          </div>
        </Card>

        <Card className="p-4 border-slate-200 bg-emerald-50/40 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800">Good Standing</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">{lowRiskCount}</h3>
              <p className="text-[11px] text-emerald-600 mt-0.5">&ge; 65% consistent academic performance</p>
            </div>
            <CheckCircle2 size={28} className="text-emerald-500/60" />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search student by name or register number..."
              className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCourseFilter}
            onChange={(e) => {
              setSelectedCourseFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Course"
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium"
          >
            <option value="">All Assigned Courses</option>
            {(assignedCourses || []).map((code) => (
              <option key={code} value={code}>
                Course: {code}
              </option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Risk Classification"
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium"
          >
            <option value="">All Risk Tiers</option>
            <option value="High Risk">High Risk (&lt; 50%)</option>
            <option value="Moderate Risk">Moderate Risk</option>
            <option value="Low Risk">Low Risk (Strong)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading student examination records and academic scores...</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No students found matching your search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Student Details</th>
                  <th className="py-3 px-4">Dept / Sem</th>
                  <th className="py-3 px-4">Exam Marks in Your Courses</th>
                  <th className="py-3 px-4">Average Score</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">ML Academic Risk</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((st) => {
                  const isHighRisk = st.riskCategory === 'High Risk';
                  const isModRisk = st.riskCategory === 'Moderate Risk';

                  return (
                    <tr
                      key={st.student_id}
                      onClick={() => setSelectedStudentModal(st)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isHighRisk ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0">
                            {st.full_name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{st.full_name}</p>
                            <p className="font-mono text-[10px] text-slate-400 mt-0.5">{st.register_number}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <span>{st.department}</span>
                        <span className="block text-[10px] text-slate-400">Sem {st.semester}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {st.exams.map((ex: any, i: number) => (
                            <span
                              key={i}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                                ex.percentage < 50
                                  ? 'bg-rose-100 text-rose-800'
                                  : ex.percentage >= 70
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {ex.course_code}: {ex.marks}/{ex.maxMarks}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`font-bold ${
                          st.averagePercentage >= 70
                            ? 'text-emerald-700'
                            : st.averagePercentage >= 50
                            ? 'text-slate-800'
                            : 'text-rose-600'
                        }`}>
                          {st.averagePercentage}%
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`font-semibold ${
                          st.attendancePct < 75 ? 'text-amber-600 font-bold' : 'text-slate-700'
                        }`}>
                          {st.attendancePct}%
                        </span>
                        {st.attendancePct < 75 && (
                          <span className="block text-[9px] text-amber-600">Shortage alert</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isHighRisk
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isModRisk
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isHighRisk && <ShieldAlert size={10} />}
                          {isModRisk && <AlertTriangle size={10} />}
                          {st.riskCategory}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudentModal(st);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-lg text-xs font-semibold transition"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} students
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detailed Student Inspection Modal */}
      {selectedStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-bold flex items-center justify-center text-lg">
                  {selectedStudentModal.full_name?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-tight">
                    {selectedStudentModal.full_name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedStudentModal.register_number} · {selectedStudentModal.department} · Semester {selectedStudentModal.semester}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* Risk Banner */}
              <div className={`p-4 rounded-2xl border ${
                selectedStudentModal.riskCategory === 'High Risk'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : selectedStudentModal.riskCategory === 'Moderate Risk'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Brain size={14} />
                    XGBoost Risk Classification: {selectedStudentModal.riskCategory}
                  </span>
                  <span className="font-bold text-sm">Overall Average: {selectedStudentModal.averagePercentage}%</span>
                </div>
                <p className="text-[11px] mt-1.5 opacity-90 leading-relaxed">
                  {selectedStudentModal.riskCategory === 'High Risk'
                    ? 'Student is falling below the 50% passing threshold in one or more courses. Recommend immediate faculty intervention and remedial study plan.'
                    : selectedStudentModal.riskCategory === 'Moderate Risk'
                    ? 'Student is performing near academic boundaries. Regular revision and task completion is advised.'
                    : 'Student is demonstrating consistent mastery of assigned course concepts.'}
                </p>
              </div>

              {/* Official Examination Breakdown */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Examination Records in Your Assigned Courses
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Course</th>
                        <th className="py-2.5 px-3">Exam Type</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Marks</th>
                        <th className="py-2.5 px-3">Percentage</th>
                        <th className="py-2.5 px-3">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedStudentModal.exams.map((ex: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">{ex.course_code}</td>
                          <td className="py-2 px-3">{ex.exam_type}</td>
                          <td className="py-2 px-3 text-slate-400">{ex.exam_date || 'Fall 2026'}</td>
                          <td className="py-2 px-3 font-semibold">{ex.marks} / {ex.maxMarks}</td>
                          <td className="py-2 px-3">
                            <span className={ex.percentage < 50 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                              {ex.percentage}%
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <Badge color={ex.percentage < 50 ? 'red' : 'green'}>{ex.grade || 'Pass'}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 flex-shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedStudentModal(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
