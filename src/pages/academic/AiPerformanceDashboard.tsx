import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, ShieldCheck, Activity, RefreshCw,
  CheckCircle2, ArrowRight, Users, Search, AlertCircle,
  GraduationCap, BookOpen, Clock,
} from 'lucide-react';
import { aiApiClient, type AtRiskStudentSummary } from '../../ai/services/aiApiClient';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function AiPerformanceDashboard() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  // Fetch At-Risk Students Overview from backend
  const {
    data: atRiskData,
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ['ai-at-risk-students'],
    queryFn: () => aiApiClient.getAtRiskStudents(100),
    retry: 1,
  });

  const studentsList: AtRiskStudentSummary[] = atRiskData?.students || [];

  // Filter students by search, department, and risk level
  const filteredStudents = studentsList.filter((s) => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch =
      !term ||
      s.full_name?.toLowerCase().includes(term) ||
      s.roll_number?.toLowerCase().includes(term);
    const matchDept = !deptFilter || s.department === deptFilter;
    const matchRisk = !riskFilter || s.predicted_risk === riskFilter;
    return matchSearch && matchDept && matchRisk;
  });

  // Unique departments for filter dropdown
  const uniqueDepts = Array.from(new Set(studentsList.map((s) => s.department))).filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              AI Student Performance & Academic Risk Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              Administrator Portal
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Automated institution-wide risk diagnostics, grade evaluations, and timely student intervention recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<RefreshCw size={14} className={studentsLoading ? 'animate-spin' : ''} />}
            onClick={() => refetchStudents()}
          >
            Refresh Records
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Students Evaluated"
          value={atRiskData?.summary?.total_evaluated ?? 0}
          icon={<Users size={20} />}
          color="blue"
          subtitle="Enrolled student records"
        />
        <StatCard
          title="High Risk Flagged"
          value={atRiskData?.summary?.high_risk_count ?? 0}
          icon={<ShieldAlert size={20} />}
          color="red"
          subtitle="Immediate faculty intervention"
        />
        <StatCard
          title="Moderate Risk"
          value={atRiskData?.summary?.moderate_risk_count ?? 0}
          icon={<Activity size={20} />}
          color="amber"
          subtitle="Academic monitoring advised"
        />
        <StatCard
          title="Satisfactory (On Track)"
          value={atRiskData?.summary?.low_risk_count ?? 0}
          icon={<ShieldCheck size={20} />}
          color="emerald"
          subtitle="Normal academic progress"
        />
      </div>

      {/* Institution At-Risk Registry & Intervention Directory */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Institution Academic Performance & At-Risk Directory
            </h3>
            <p className="text-xs text-slate-400">
              Prioritized student registry analyzed via examination marks, course backlogs, and attendance records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name or reg no..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 md:w-52"
              />
            </div>

            {/* Department Filter */}
            {uniqueDepts.length > 0 && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {uniqueDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            {/* Risk Level Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Risk Levels</option>
              <option value="High Risk">High Risk Only</option>
              <option value="Moderate Risk">Moderate Risk Only</option>
              <option value="Low Risk">Low Risk (On Track)</option>
            </select>
          </div>
        </div>

        {studentsLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-xl border border-slate-100">
            <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">No Matching Student Records Found</p>
            <p className="text-xs text-slate-400 mt-1">
              {studentsList.length === 0
                ? 'No students currently have exam records in the database, or backend service is syncing.'
                : 'All students meet satisfactory criteria for this filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-semibold">Student Details</th>
                  <th className="py-3 px-3 font-semibold">Department & Term</th>
                  <th className="py-3 px-3 font-semibold text-center">Avg Exam Score</th>
                  <th className="py-3 px-3 font-semibold text-center">Attendance</th>
                  <th className="py-3 px-3 font-semibold text-center">Failed Exams</th>
                  <th className="py-3 px-3 font-semibold text-center">AI Risk Status</th>
                  <th className="py-3 px-3 font-semibold text-center">Probability</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.student_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{s.full_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{s.roll_number}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-700">{s.department}</span>
                      <span className="text-[11px] text-slate-400 block">Semester {s.semester}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold ${
                          s.avg_marks < 50
                            ? 'bg-red-50 text-red-700'
                            : s.avg_marks < 60
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {s.avg_marks}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-semibold ${
                          s.attendance_pct < 75 ? 'text-amber-600 font-bold' : 'text-slate-700'
                        }`}
                      >
                        {s.attendance_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {s.failed_exams > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                          {s.failed_exams} backlog{s.failed_exams > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                          s.predicted_risk === 'High Risk'
                            ? 'bg-red-100 text-red-800'
                            : s.predicted_risk === 'Moderate Risk'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {s.predicted_risk}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                      {(s.risk_probability * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<ArrowRight size={12} />}
                        onClick={() => navigate(`/management/students/${s.student_id}`)}
                      >
                        View Profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Institutional Guidance for Faculty & Academic Advisors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                High Risk Action Protocol
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Schedule mandatory academic counseling with faculty advisor within 48 hours. Issue remedial tutorial assignments and notify parents/guardians.
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Activity size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Moderate Risk Protocol
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Review class attendance logs and assignment submissions. Recommend peer tutoring study groups and monitor upcoming internal examination scores.
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Satisfactory Student Trend
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Student maintains passing average (&gt;60%) and compliant attendance (&gt;75%). Eligible for specialized honors electives, research projects, and campus clubs.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
