import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, BookOpen, Award, Home, Bus, Star, Trophy,
  AlertCircle, Brain, ExternalLink, ShieldAlert, ShieldCheck, Activity,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatDate, getStatusColor } from '../../lib/utils';
import { getStudentAnalysis } from '../../ai/services/studentAnalysis';

function useStudentProfile(id: string) {
  return useQuery({
    queryKey: ['student-profile', id],
    queryFn: async () => {
      // Step 1: fetch student first so we have dept/batch for fee lookup.
      // Support lookups by both UUID student_id and string roll_number.
      let query = supabase.from('students').select('*');
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        query = query.eq('student_id', id);
      } else {
        query = query.eq('register_number', id);
      }
      const studentRes = await query.maybeSingle();
      if (studentRes.error) throw studentRes.error;
      const student = studentRes.data;
      if (!student) throw new Error(`Student record not found for "${id}".`);
      const studentId = student.student_id;

      // Step 2: all related data in parallel using resolved studentId
      const [
        enrollmentsRes,
        attendanceRes,
        examsRes,
        hostelRes,
        transportRes,
        clubsRes,
        sportsRes,
        feeRes,
        financeRes,
      ] = await Promise.all([
        supabase.from('enrollments').select('*, courses(course_name, credits)').eq('student_id', studentId),
        supabase.from('attendance').select('status').eq('student_id', studentId),
        supabase
          .from('examinations')
          .select(`
            *,
            courses(course_name)
          `)
          .eq('student_id', studentId)
          .order('exam_date', { ascending: false }),
        supabase.from('hostel_allocations').select('*, hostel_rooms(block, room_number)').eq('student_id', studentId).maybeSingle(),
        supabase.from('transport_allocations').select('*, transport_routes(route_name, start_point, end_point)').eq('student_id', studentId).maybeSingle(),
        supabase.from('club_memberships').select('*, clubs(club_name, category)').eq('student_id', studentId),
        supabase.from('sports_participation').select('*, sports_teams(sport_name, category)').eq('student_id', studentId),
        supabase.from('fee_structure').select('total_fee').eq('department_id', student.department_id ?? '').eq('batch_year', student.batch_year ?? 0).maybeSingle(),
        supabase.from('finance_transactions').select('amount_paid').eq('student_id', studentId),
      ]);

      const attendance = attendanceRes.data ?? [];
      const present = attendance.filter((a) => a.status === 'Present').length;
      const attendancePct = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : null;

      const totalFee = feeRes.data?.total_fee ?? 0;
      if (examsRes.error) {
  console.error('Exam query error:', examsRes.error);
  throw examsRes.error;
} 
      const totalPaid = (financeRes.data ?? []).reduce((sum: number, t: any) => sum + (t.amount_paid ?? 0), 0);

      return {
        student,
        enrollments: enrollmentsRes.data ?? [],
        attendancePct,
        totalAttendance: attendance.length,
        exams: examsRes.data ?? [],
        hostel: hostelRes.data,
        transport: transportRes.data,
        clubs: clubsRes.data ?? [],
        sports: sportsRes.data ?? [],
        totalFee,
        totalPaid,
        outstanding: totalFee - totalPaid,
      };
    },
    enabled: !!id,
  });
}

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useStudentProfile(id!);
  const {
  data: aiAnalysis,
  isLoading: aiLoading,
  error: aiError,
} = useQuery({
  queryKey: ['student-ai-analysis', id],
  queryFn: () => getStudentAnalysis(data!.student.student_id),
  enabled: !!data?.student?.student_id,
});

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-40 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !data?.student) {
    return (
      <div className="bg-white rounded-xl border border-red-100 shadow-sm p-8 text-center">
        <p className="text-lg font-semibold text-slate-700 mb-2">Student not found</p>
        <p className="text-sm text-red-500 mb-4">{(error as any)?.message ?? `No student with id "${id}" exists.`}</p>
        <button onClick={() => navigate('/management/students')} className="text-blue-600 text-sm underline">← Back to Students</button>
      </div>
    );
  }

  const s = data!.student;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" icon={<ArrowLeft size={15} />} onClick={() => navigate('/management/students')}>
          Back
        </Button>
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <User size={28} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{s.full_name}</h1>
            <p className="text-blue-200 text-sm">{s.register_number || s.roll_number} · {s.department}</p>
            <div className="flex flex-wrap gap-3 mt-3 text-sm">
              <span className="bg-white/15 rounded-lg px-3 py-1">Batch {s.batch_year}</span>
              <span className="bg-white/15 rounded-lg px-3 py-1">Semester {s.current_semester}</span>
              <Badge color={getStatusColor(s.status) as any} className="self-center">{s.status}</Badge>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/20">
          <div>
            <p className="text-blue-200 text-xs">Email</p>
            <p className="text-sm truncate">{s.email}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Phone</p>
            <p className="text-sm">{s.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Admission Date</p>
            <p className="text-sm">{formatDate(s.admission_date)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Gender</p>
            <p className="text-sm">{s.gender ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{data?.attendancePct != null ? `${data.attendancePct}%` : '—'}</p>
          <p className="text-xs text-slate-500 mt-1">Attendance</p>
          <p className="text-xs text-slate-400">{data?.totalAttendance} records</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{data?.enrollments.length ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Enrolled Courses</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{data?.exams.length ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Exams Taken</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <p className={`text-3xl font-bold ${(data?.outstanding ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            ₹{((data?.outstanding ?? 0) / 1000).toFixed(0)}K
          </p>
          <p className="text-xs text-slate-500 mt-1">Outstanding Fee</p>
        </div>
      </div>
      {/* AI Performance & Machine Learning Risk Prediction */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Brain size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                AI Academic Performance & Risk Assessment
              </h3>
              <p className="text-xs text-slate-400">
                Supervised predictive machine learning & multi-factor diagnostic analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {aiAnalysis?.isModelPrediction ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                XGBoost Trained Model
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Rule-Based Analysis
              </span>
            )}
          </div>
        </div>

        {aiLoading ? (
          <div className="space-y-3">
            <div className="skeleton h-24 rounded-xl" />
            <div className="skeleton h-16 rounded-xl" />
          </div>
        ) : aiError ? (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle size={18} className="text-red-500" />
            <p className="text-sm text-red-600">
              Unable to generate performance analysis for this student.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Risk Overview Banner */}
            <div
              className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                aiAnalysis?.riskCategory === 'High Risk'
                  ? 'bg-red-50/70 border-red-200 text-red-950'
                  : aiAnalysis?.riskCategory === 'Moderate Risk'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex items-start gap-3">
                {aiAnalysis?.riskCategory === 'High Risk' ? (
                  <ShieldAlert size={26} className="text-red-600 flex-shrink-0 mt-0.5" />
                ) : aiAnalysis?.riskCategory === 'Moderate Risk' ? (
                  <Activity size={26} className="text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck size={26} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Predicted Risk Category:
                    </span>
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded-md text-xs ${
                        aiAnalysis?.riskCategory === 'High Risk'
                          ? 'bg-red-600 text-white'
                          : aiAnalysis?.riskCategory === 'Moderate Risk'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {aiAnalysis?.riskCategory}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Calculated Risk Probability:{' '}
                    <span className="font-semibold text-slate-900">
                      {((aiAnalysis?.riskProbability ?? 0) * 100).toFixed(0)}%
                    </span>{' '}
                    · Academic Average:{' '}
                    <span className="font-semibold text-slate-900">
                      {aiAnalysis?.overallAverage}%
                    </span>{' '}
                    across {aiAnalysis?.totalExams} exam(s)
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="text-[11px] text-slate-400 block">
                  Target Pass Threshold
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  50.0% Minimum
                </span>
              </div>
            </div>

            {/* Contributing factors */}
            {(aiAnalysis?.contributingFactors ?? []).length > 0 && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Key Diagnostic Factors:
                </p>
                <ul className="space-y-1.5">
                  {aiAnalysis?.contributingFactors.map((factor, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-600 flex items-start gap-2"
                    >
                      <span className="text-purple-600 font-bold">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Decision support disclaimer */}
            <p className="text-[11px] text-slate-400 italic">
              ⚠️ {aiAnalysis?.predictionDisclaimer}
            </p>
          </div>
        )}
      </Card>

      {/* AI Study Recommendations */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={18} className="text-purple-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Personalized Study Topics & Resources
            </h3>
            <p className="text-xs text-slate-400">
              Targeted revision curricula based on verified exam marks
            </p>
          </div>
        </div>

        {aiLoading ? (
          <div className="space-y-3">
            <div className="skeleton h-20 rounded-xl" />
            <div className="skeleton h-20 rounded-xl" />
          </div>
        ) : (aiAnalysis?.performance ?? []).length === 0 ? (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <AlertCircle size={24} className="text-slate-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No Exam Data Available</p>
            <p className="text-sm text-slate-500 mt-1">
              No examination records exist for this student yet.
            </p>
          </div>
        ) : (aiAnalysis?.recommendations ?? []).length === 0 ? (
          <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
            <Award size={24} className="text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold text-emerald-700">Satisfactory Performance!</p>
            <p className="text-sm text-emerald-600 mt-1">
              No courses are below the 50% passing threshold. Keep up the strong momentum!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {aiAnalysis?.recommendations.map((recommendation) => (
              <div
                key={recommendation.courseCode}
                className="p-4 rounded-xl bg-purple-50/60 border border-purple-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">
                        {recommendation.courseName}
                      </p>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-500 border border-purple-100">
                        {recommendation.courseCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          recommendation.priority === 'High'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {recommendation.priority} Priority
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      Recent Marks:{' '}
                      <span className="font-semibold text-red-600">
                        {recommendation.percentage}%
                      </span>{' '}
                      · {recommendation.level} Performance Level
                    </p>
                  </div>

                  <BookOpen size={18} className="text-purple-600 flex-shrink-0" />
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Recommended Study Topics
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recommendation.topics.map((topic) => (
                      <span
                        key={topic}
                        className="px-2.5 py-1 text-xs rounded-lg bg-white border border-purple-100 text-slate-600"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Curated Learning Resources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recommendation.resources.map((resource) => (
                      <button
                        key={resource.type}
                        onClick={() => window.open(resource.url, '_blank')}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition flex items-center gap-1 shadow-sm"
                      >
                        {resource.type}
                        <ExternalLink size={11} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Enrollments */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">Course Enrollments</h3>
          </div>
          {(data?.enrollments ?? []).length === 0
            ? <p className="text-sm text-slate-400">No enrollments found.</p>
            : (data?.enrollments ?? []).map((e: any) => (
              <div key={e.enrollment_id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{e.courses?.course_name ?? e.course_code}</p>
                  <p className="text-xs text-slate-400">{e.academic_term} · {e.courses?.credits ?? '?'} credits</p>
                </div>
                <Badge color={getStatusColor(e.status) as any}>{e.status}</Badge>
              </div>
            ))}
        </Card>

        {/* Exam Results */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Award size={16} className="text-purple-600" />
            <h3 className="text-sm font-semibold text-slate-900">Exam Results</h3>
          </div>
          {(data?.exams ?? []).length === 0
            ? <p className="text-sm text-slate-400">No exam records found.</p>
            : (data?.exams ?? []).slice(0, 6).map((e: any) => (
              <div key={e.exam_id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{e.courses?.course_name ?? e.course_code}</p>
                  <p className="text-xs text-slate-400">{formatDate(e.exam_date)} · {e.exam_type}</p>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-sm font-bold text-slate-700">{e.marks_obtained}/{e.max_marks}</span>
                  <Badge color={getStatusColor(e.result ?? '') as any}>{e.grade ?? '—'}</Badge>
                </div>
              </div>
            ))}
        </Card>

        {/* Hostel & Transport */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Home size={16} className="text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-900">Accommodation</h3>
          </div>
          {data?.hostel ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Block</span>
                <span className="font-medium">{(data.hostel as any).hostel_rooms?.block ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Room</span>
                <span className="font-medium">{(data.hostel as any).hostel_rooms?.room_number ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <Badge color={getStatusColor((data.hostel as any).status) as any}>{(data.hostel as any).status}</Badge>
              </div>
            </div>
          ) : <p className="text-sm text-slate-400">No hostel allocation.</p>}

          <div className="mt-5 pt-4 border-t border-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <Bus size={14} className="text-blue-600" />
              <h4 className="text-sm font-semibold text-slate-900">Transport</h4>
            </div>
            {data?.transport ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Route</span>
                  <span className="font-medium">{(data.transport as any).transport_routes?.route_name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pickup Point</span>
                  <span className="font-medium">{(data.transport as any).pickup_point ?? '—'}</span>
                </div>
              </div>
            ) : <p className="text-sm text-slate-400">No transport allocation.</p>}
          </div>
        </Card>

        {/* Clubs & Sports */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-900">Clubs & Activities</h3>
          </div>
          {(data?.clubs ?? []).length === 0
            ? <p className="text-sm text-slate-400 mb-3">Not a member of any club.</p>
            : (data?.clubs ?? []).map((c: any) => (
              <div key={c.membership_id} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm font-medium">{c.clubs?.club_name}</p>
                  <p className="text-xs text-slate-400">{c.clubs?.category} · {c.role}</p>
                </div>
              </div>
            ))}

          <div className="mt-4 pt-3 border-t border-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={14} className="text-emerald-600" />
              <h4 className="text-sm font-semibold">Sports</h4>
            </div>
            {(data?.sports ?? []).length === 0
              ? <p className="text-sm text-slate-400">No sports participation.</p>
              : (data?.sports ?? []).map((sp: any) => (
                <div key={sp.participation_id} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm font-medium">{sp.sports_teams?.sport_name}</p>
                    <p className="text-xs text-slate-400">{sp.position} · {sp.season}</p>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
