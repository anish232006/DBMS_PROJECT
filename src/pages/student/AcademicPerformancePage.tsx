import { useQuery } from '@tanstack/react-query';
import {
  Award, Brain, AlertCircle, ShieldAlert,
  ShieldCheck, BarChart2, TrendingUp, Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStudentAnalysis } from '../../ai/services/studentAnalysis';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

export default function AcademicPerformancePage() {
  const { student } = useAuth();

  const {
    data: analysis,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['student-academic-performance', student?.student_id],
    queryFn: () => getStudentAnalysis(student!.student_id),
    enabled: !!student?.student_id,
  });

  if (!student) return null;

  const performance = analysis?.performance ?? [];

  // Chart data
  const chartData = performance.map((p) => ({
    code: p.courseCode,
    name: p.courseName,
    percentage: p.percentage,
    passMark: 50,
  }));

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Academic Performance & Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">
          Detailed diagnostic evaluation, subject-level breakdowns, and supervised XGBoost risk estimation
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-32 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>Failed to load academic records: {(error as any)?.message}</span>
        </div>
      ) : (
        <>
          {/* Diagnostic Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3.5">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <BarChart2 size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Cumulative Average</p>
                <p className="text-xl font-bold text-slate-900">{analysis?.overallAverage}%</p>
                <p className="text-[11px] text-slate-500">{analysis?.totalExams} examinations evaluated</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Award size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Passing Courses</p>
                <p className="text-xl font-bold text-slate-900">
                  {performance.filter((p) => p.level !== 'Weak').length} of {performance.length}
                </p>
                <p className="text-[11px] text-slate-500">Above 50% threshold</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3.5">
              <div className={`p-3 rounded-xl ${analysis?.weakCount ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <TrendingUp size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Intervention Focus</p>
                <p className="text-xl font-bold text-slate-900">{analysis?.weakCount} Subject(s)</p>
                <p className="text-[11px] text-slate-500">Recommended for revision</p>
              </div>
            </div>
          </div>

          {/* AI Risk Assessment Card (Distinguishing ML from Rules) */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Brain size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Predictive Academic Risk Assessment</h2>
                  <p className="text-[11px] text-slate-400">
                    Decision-support projection generated from historical examination markers
                  </p>
                </div>
              </div>

              <div>
                {analysis?.isModelPrediction ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Trained XGBoost Classifier
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    Rule-Based Historical Assessment
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  analysis?.riskCategory === 'High Risk'
                    ? 'bg-red-50/70 border-red-200 text-red-950'
                    : analysis?.riskCategory === 'Moderate Risk'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {analysis?.riskCategory === 'High Risk' ? (
                    <ShieldAlert size={28} className="text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck size={28} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Predicted Category:
                      </span>
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded text-xs ${
                          analysis?.riskCategory === 'High Risk'
                            ? 'bg-red-600 text-white'
                            : analysis?.riskCategory === 'Moderate Risk'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {analysis?.riskCategory}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1">
                      Calibrated Risk Probability:{' '}
                      <span className="font-bold text-slate-900">
                        {((analysis?.riskProbability ?? 0) * 100).toFixed(0)}%
                      </span>{' '}
                      · Target Passing Standard: <span className="font-semibold">50.0% Cumulative Average</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Explanatory Factors */}
              {(analysis?.contributingFactors ?? []).length > 0 && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                  <p className="font-semibold text-slate-700 mb-2">Model Diagnostic Evidence:</p>
                  <ul className="space-y-1.5">
                    {analysis?.contributingFactors.map((f, i) => (
                      <li key={i} className="text-slate-600 flex items-start gap-2 text-[11px]">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-800 flex items-start gap-2">
                <Info size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Distinction Notice:</strong> The marks shown below are your actual official records entered into the university database. The risk probability above is generated by machine learning as an early-warning guide and does not constitute an official academic transcript decision.
                </span>
              </div>
            </div>
          </Card>

          {/* Performance Comparison Chart */}
          {chartData.length > 0 && (
            <Card>
              <div className="mb-4 pb-2 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Subject Performance Comparison</h2>
                <p className="text-xs text-slate-400">Recorded marks (%) vs. 50% passing threshold</p>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(val: any, _name: any, item: any) => [
                        `${val}% (${item.payload.name})`,
                        'Marks Obtained',
                      ]}
                    />
                    <ReferenceLine
                      y={50}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: '50% Threshold', fill: '#ef4444', fontSize: 10, position: 'right' }}
                    />
                    <Bar dataKey="percentage" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Detailed Course Breakdown Table */}
          <Card>
            <div className="mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Official Examination Breakdown</h2>
              <p className="text-xs text-slate-400">Actual examination scores retrieved from database</p>
            </div>

            {performance.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs">
                No examination records found for your student profile.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Course Code</th>
                      <th className="py-3 px-4 font-semibold">Course Name</th>
                      <th className="py-3 px-3 font-semibold text-center">Exam Date</th>
                      <th className="py-3 px-3 font-semibold text-center">Marks Obtained</th>
                      <th className="py-3 px-3 font-semibold text-center">Percentage</th>
                      <th className="py-3 px-4 font-semibold text-right">Performance Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {performance.map((p) => (
                      <tr key={p.courseCode} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {p.courseCode}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {p.courseName}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500">
                          {p.examDate ? formatDate(p.examDate) : 'Recorded'}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {p.marks} / {p.maxMarks}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-bold ${
                              p.percentage < 50
                                ? 'text-red-600'
                                : p.percentage < 70
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {p.percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge
                            color={
                              p.level === 'Weak'
                                ? ('red' as any)
                                : p.level === 'Average'
                                ? ('amber' as any)
                                : ('emerald' as any)
                            }
                          >
                            {p.level}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
