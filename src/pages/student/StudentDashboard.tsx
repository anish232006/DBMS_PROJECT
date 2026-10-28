import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Award, CheckSquare, BookOpen, AlertCircle, Calendar,
  ArrowRight, Brain, Clock, ShieldCheck, ShieldAlert,
  Sparkles, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getStudentAnalysis } from '../../ai/services/studentAnalysis';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

export default function StudentDashboard() {
  const { student } = useAuth();
  const navigate = useNavigate();

  // 1. Fetch Student AI Analysis & Exam Results
  const {
    data: analysis,
    isLoading: analysisLoading,
  } = useQuery({
    queryKey: ['student-analysis', student?.student_id],
    queryFn: () => getStudentAnalysis(student!.student_id),
    enabled: !!student?.student_id,
  });

  // 2. Fetch Student Attendance Records
  const {
    data: attendanceRecords = [],
    isLoading: attendanceLoading,
  } = useQuery({
    queryKey: ['student-attendance', student?.student_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', student!.student_id)
        .order('attendance_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!student?.student_id,
  });

  // 3. Fetch Student Timetable (filtered by department & semester)
  const {
    data: timetable = [],
    isLoading: timetableLoading,
  } = useQuery({
    queryKey: ['student-timetable', student?.department_id, student?.current_semester],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timetable')
        .select(`
          timetable_id,
          day_of_week,
          start_time,
          end_time,
          semester_section,
          course_code,
          courses(course_name, credits),
          classrooms(room_number, building),
          faculty(full_name)
        `)
        .eq('department_id', student!.department_id)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!student?.department_id,
  });

  if (!student) return null;

  // Calculate Attendance KPI
  const presentCount = attendanceRecords.filter(
    (a) => String(a.status).toLowerCase() === 'present'
  ).length;
  const attendancePct =
    attendanceRecords.length > 0
      ? Math.round((presentCount / attendanceRecords.length) * 100)
      : null;

  // Today's classes from timetable
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysClasses = timetable.filter(
    (t: any) => t.day_of_week?.toLowerCase() === todayName.toLowerCase()
  );

  // Performance chart data
  const performanceData = (analysis?.performance ?? []).map((p) => ({
    name: p.courseCode,
    fullName: p.courseName,
    score: p.percentage,
    passingThreshold: 50,
  }));

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* A. Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/10">
        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white backdrop-blur-md">
              {student.department} Department
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white backdrop-blur-md">
              Semester {student.current_semester}
            </span>
            <span className="text-xs text-blue-200">
              · {currentDateFormatted}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hello, {student.full_name}
          </h1>

          <p className="mt-2 text-sm text-blue-100/90 leading-relaxed max-w-2xl">
            {analysisLoading ? (
              'Aggregating your academic records...'
            ) : (analysis?.performance ?? []).length === 0 ? (
              `Welcome to your student portal. You are enrolled in Semester ${student.current_semester}. Check your timetable and enrolled course curriculum below.`
            ) : analysis?.weakCount === 0 ? (
              `Outstanding work! You have completed ${analysis?.totalExams} examinations with an overall average of ${analysis?.overallAverage}%. All subjects meet or exceed passing thresholds.`
            ) : (
              `You have completed ${analysis?.totalExams} examinations with an overall average of ${analysis?.overallAverage}%. Our AI study diagnostic identified ${analysis?.weakCount} subject(s) recommended for targeted revision.`
            )}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<FileTextIcon size={14} />}
              onClick={() => navigate('/student/examination-results')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md"
            >
              Exam Results
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Brain size={14} />}
              onClick={() => navigate('/student/study-assistant')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md"
            >
              Ask AI Study Assistant
            </Button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* B. Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Attendance"
          value={attendanceLoading ? '...' : attendancePct != null ? `${attendancePct}%` : 'N/A'}
          icon={<CheckSquare size={20} />}
          color={attendancePct != null && attendancePct < 75 ? 'amber' : 'emerald'}
          subtitle={
            attendanceRecords.length > 0
              ? `${presentCount} of ${attendanceRecords.length} sessions attended`
              : 'No sessions logged yet'
          }
        />

        <StatCard
          title="Academic Average"
          value={analysisLoading ? '...' : (analysis?.performance.length ?? 0) > 0 ? `${analysis?.overallAverage}%` : 'N/A'}
          icon={<Award size={20} />}
          color={(analysis?.overallAverage ?? 0) < 50 ? 'red' : 'blue'}
          subtitle={
            (analysis?.performance.length ?? 0) > 0
              ? `Across ${analysis?.totalExams} recorded examinations`
              : 'Awaiting exam entries'
          }
        />

        <StatCard
          title="Exams Completed"
          value={analysisLoading ? '...' : analysis?.totalExams ?? 0}
          icon={<BookOpen size={20} />}
          color="purple"
          subtitle="Official examination results"
        />

        <StatCard
          title="Focus Subjects"
          value={analysisLoading ? '...' : analysis?.weakCount ?? 0}
          icon={<AlertCircle size={20} />}
          color={(analysis?.weakCount ?? 0) > 0 ? 'red' : 'emerald'}
          subtitle={
            (analysis?.weakCount ?? 0) > 0
              ? 'Subjects scoring below 50%'
              : 'All courses on track'
          }
        />
      </div>

      {/* C. Academic Performance Chart & Predictive Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Examination Performance by Subject
              </h2>
              <p className="text-xs text-slate-400">
                Marks obtained (%) compared against the 50% passing threshold
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowRight size={12} />}
              onClick={() => navigate('/student/academic-performance')}
            >
              Full Analysis
            </Button>
          </div>

          {analysisLoading ? (
            <div className="skeleton h-56 rounded-xl" />
          ) : performanceData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-100 text-center p-4">
              <BookOpen size={28} className="text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">No Examination Records Found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Your examination scores will appear here as soon as faculties enter semester marks into the database.
              </p>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(val: any, _name: any, item: any) => [
                      `${val}% (${item.payload.fullName})`,
                      'Score',
                    ]}
                  />
                  <ReferenceLine
                    y={50}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: '50% Pass', fill: '#ef4444', fontSize: 10, position: 'right' }}
                  />
                  <Bar dataKey="score" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* AI Academic Risk & Status */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-purple-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  AI Academic Standing
                </h2>
              </div>
              {analysis?.isModelPrediction ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  XGBoost ML
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                  Rule Analysis
                </span>
              )}
            </div>

            {analysisLoading ? (
              <div className="space-y-3">
                <div className="skeleton h-20 rounded-xl" />
                <div className="skeleton h-20 rounded-xl" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Risk Level Badge */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                    analysis?.riskCategory === 'High Risk'
                      ? 'bg-red-50 border-red-200 text-red-950'
                      : analysis?.riskCategory === 'Moderate Risk'
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  }`}
                >
                  {analysis?.riskCategory === 'High Risk' ? (
                    <ShieldAlert size={24} className="text-red-600 flex-shrink-0" />
                  ) : (
                    <ShieldCheck size={24} className="text-emerald-600 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Predictive Risk Level
                    </p>
                    <p className="text-sm font-bold">{analysis?.riskCategory}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Probability: {((analysis?.riskProbability ?? 0) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Contributing factors */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <p className="font-semibold text-slate-700">Diagnostic Factors:</p>
                  {(analysis?.contributingFactors ?? []).length > 0 ? (
                    analysis?.contributingFactors.map((f, i) => (
                      <p key={i} className="text-slate-600 flex items-start gap-1.5 text-[11px]">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>{f}</span>
                      </p>
                    ))
                  ) : (
                    <p className="text-slate-400 text-[11px]">No risk indicators detected.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-400 italic mt-3 pt-2 border-t border-slate-100">
            ⚠️ Decision-support estimate for academic preparation.
          </p>
        </Card>
      </div>

      {/* D. Personalized Recommendations & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommended Study Focus */}
        <Card>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-purple-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">Personalized Study Recommendations</h2>
                <p className="text-xs text-slate-400">Curated revision modules based on your marks</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowRight size={12} />}
              onClick={() => navigate('/student/study-resources')}
            >
              Resources
            </Button>
          </div>

          {analysisLoading ? (
            <div className="skeleton h-36 rounded-xl" />
          ) : (analysis?.recommendations ?? []).length === 0 ? (
            <div className="p-6 text-center bg-emerald-50/50 rounded-xl border border-emerald-100">
              <ShieldCheck size={28} className="text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-emerald-800 text-xs">No Critical Academic Deficits</p>
              <p className="text-[11px] text-emerald-600 mt-1">
                You are performing satisfactorily across all tested subjects!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {analysis?.recommendations.slice(0, 2).map((rec) => (
                <div key={rec.courseCode} className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{rec.courseName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {rec.courseCode} · Score: <span className="font-bold text-red-600">{rec.percentage}%</span>
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                      {rec.priority} Priority
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {rec.topics.slice(0, 3).map((topic, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-purple-100 text-[10px] text-slate-600">
                        {topic}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-purple-100/60 flex gap-2">
                    {rec.resources.slice(0, 2).map((res, i) => (
                      <button
                        key={i}
                        onClick={() => window.open(res.url, '_blank')}
                        className="text-[10px] font-medium text-purple-700 hover:text-purple-900 flex items-center gap-1 underline"
                      >
                        {res.type} <ExternalLink size={9} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Today's Timetable / Upcoming Classes */}
        <Card>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">Today's Schedule ({todayName})</h2>
                <p className="text-xs text-slate-400">Classes scheduled for your semester</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowRight size={12} />}
              onClick={() => navigate('/student/timetable')}
            >
              Full Timetable
            </Button>
          </div>

          {timetableLoading ? (
            <div className="skeleton h-36 rounded-xl" />
          ) : todaysClasses.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100">
              <Clock size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-xs">No Classes Scheduled Today</p>
              <p className="text-[11px] text-slate-400 mt-1">
                You have no active timetable periods scheduled for {todayName}.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todaysClasses.map((item: any) => (
                <div
                  key={item.timetable_id}
                  className="p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono text-[10px] font-bold text-center">
                      {item.start_time?.slice(0, 5)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        {item.courses?.course_name || item.course_code}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Room {item.classrooms?.room_number ?? 'TBD'} · {item.faculty?.full_name ?? 'Faculty'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.end_time?.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function FileTextIcon({ size }: { size: number }) {
  return <CheckSquare size={size} />;
}
