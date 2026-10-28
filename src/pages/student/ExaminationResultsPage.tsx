import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  Award,
  Filter,
  Layers,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';

interface ExaminationRecord {
  exam_id: string;
  student_id: string;
  course_code: string;
  exam_type: string;
  exam_date: string;
  marks_obtained: number;
  max_marks: number;
  grade?: string | null;
  result?: string | null;
  department_id?: string | null;
  courses?: {
    course_name?: string;
    credits?: number;
  } | null;
}

export default function ExaminationResultsPage() {
  const { student } = useAuth();
  const [selectedExamType, setSelectedExamType] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<string>('all');

  const {
    data: exams = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ExaminationRecord[]>({
    queryKey: ['student-examinations-detailed', student?.student_id],
    queryFn: async () => {
      if (!student?.student_id) return [];
      const { data, error } = await supabase
        .from('examinations')
        .select(`
          *,
          courses(course_name, credits)
        `)
        .eq('student_id', student.student_id)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      return (data || []) as ExaminationRecord[];
    },
    enabled: !!student?.student_id,
  });

  // Calculate statistics strictly from valid marks
  const validExams = exams.filter(e => e.max_marks && e.max_marks > 0);
  const totalExams = exams.length;
  const passCount = exams.filter(e => e.result?.toLowerCase() === 'pass' || (!e.result && e.marks_obtained / (e.max_marks || 100) >= 0.5)).length;
  const failCount = totalExams - passCount;

  const totalPercentage = validExams.length > 0
    ? validExams.reduce((acc, curr) => acc + (curr.marks_obtained / curr.max_marks) * 100, 0) / validExams.length
    : 0;

  // Filter exams
  const filteredExams = exams.filter(exam => {
    const matchesType = selectedExamType === 'all' || exam.exam_type?.toLowerCase() === selectedExamType.toLowerCase();
    const isPass = exam.result?.toLowerCase() === 'pass' || (!exam.result && exam.marks_obtained / (exam.max_marks || 100) >= 0.5);
    const matchesResult = selectedResult === 'all'
      || (selectedResult === 'pass' && isPass)
      || (selectedResult === 'fail' && !isPass);
    return matchesType && matchesResult;
  });

  const uniqueExamTypes = Array.from(new Set(exams.map(e => e.exam_type).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileText className="w-7 h-7 text-indigo-600" />
          Official Examination Transcripts
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete official academic examination grades recorded in the university database for {student?.full_name}.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Exams Recorded</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{totalExams}</span>
            <span className="text-xs text-slate-500">evaluations</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Total institutional assessments</p>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average Score</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600">
              {validExams.length > 0 ? `${totalPercentage.toFixed(1)}%` : 'N/A'}
            </span>
            <span className="text-xs text-slate-500">aggregate</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Calculated where max marks are known</p>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Passed</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600">{passCount}</span>
            <span className="text-xs text-slate-500">cleared</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Passed assessments</p>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Needs Backlog/Arrear</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-600">{failCount}</span>
            <span className="text-xs text-slate-500">subjects</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Scores below 50% pass mark</p>
        </Card>
      </div>

      {/* Results Table */}
      <Card className="p-6 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Examination Record Ledger</h3>
            <p className="text-xs text-slate-500">
              Showing {filteredExams.length} of {exams.length} recorded exam grades.
            </p>
          </div>
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </div>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Exam Types</option>
              {uniqueExamTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={selectedResult}
              onChange={(e) => setSelectedResult(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Results</option>
              <option value="pass">Passed Only</option>
              <option value="fail">Failed Only</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Loading examination records from database...
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-rose-500 text-sm">
            Failed to load examination records.
            <button onClick={() => refetch()} className="ml-2 text-indigo-600 underline">Retry</button>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">No examination records found</p>
            <p className="text-xs text-slate-400 mt-1">
              {exams.length > 0 ? 'Try clearing your filter selection.' : 'No official marks have been registered for this student yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Course Code</th>
                  <th className="py-3 px-3">Course Name</th>
                  <th className="py-3 px-3">Exam Type</th>
                  <th className="py-3 px-3 text-right">Marks Obtained</th>
                  <th className="py-3 px-3 text-right">Max Marks</th>
                  <th className="py-3 px-3 text-right">Percentage</th>
                  <th className="py-3 px-3 text-center">Grade</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredExams.map((exam) => {
                  const pct = exam.max_marks > 0 ? (exam.marks_obtained / exam.max_marks) * 100 : null;
                  const isPass = exam.result?.toLowerCase() === 'pass' || (pct !== null && pct >= 50);

                  return (
                    <tr key={exam.exam_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {exam.exam_date}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-indigo-600 whitespace-nowrap">
                        {exam.course_code}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 max-w-[200px] truncate">
                        {exam.courses?.course_name || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {exam.exam_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900">
                        {exam.marks_obtained}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {exam.max_marks || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-medium">
                        {pct !== null ? (
                          <span className={pct >= 50 ? 'text-emerald-600' : 'text-rose-600'}>
                            {pct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-800">
                          {exam.grade || (pct !== null ? (pct >= 85 ? 'O' : pct >= 75 ? 'A+' : pct >= 65 ? 'A' : pct >= 50 ? 'B' : 'F') : '—')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isPass
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {isPass ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          {isPass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
