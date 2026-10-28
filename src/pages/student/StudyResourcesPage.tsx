import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Layers,
  Award,
  Clock,
  BookmarkCheck,
  PlayCircle,
  FileText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStudentAnalysis } from '../../ai/services/studentAnalysis';
import { Card } from '../../components/ui/Card';

export default function StudyResourcesPage() {
  const { student } = useAuth();
  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined' && student?.student_id) {
      const saved = localStorage.getItem(`universe_completed_study_${student.student_id}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore parsing error
        }
      }
    }
    return {};
  });

  const toggleTopic = (topicKey: string) => {
    const next = { ...completedTopics, [topicKey]: !completedTopics[topicKey] };
    setCompletedTopics(next);
    if (student?.student_id) {
      localStorage.setItem(`universe_completed_study_${student.student_id}`, JSON.stringify(next));
    }
  };

  const {
    data: analysis,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['student-analysis', student?.student_id],
    queryFn: () => getStudentAnalysis(student!.student_id),
    enabled: !!student?.student_id,
  });

  const recommendations = analysis?.recommendations || [];
  const completedCount = Object.values(completedTopics).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Curated Study Resources & Syllabus Modules
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Verified educational videos and syllabus-aligned course materials targeted to your examination performance.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
          <BookmarkCheck className="w-5 h-5 text-indigo-600" />
          <div className="text-xs">
            <div className="font-semibold text-slate-800">{completedCount} Topics Mastered</div>
            <div className="text-slate-400">Personal study tracker</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Analyzing course examination results and preparing verified syllabus modules...
        </div>
      ) : isError ? (
        <div className="py-16 text-center text-rose-500 text-sm">
          Failed to load study recommendations.
          <button onClick={() => refetch()} className="ml-2 text-indigo-600 underline">Retry</button>
        </div>
      ) : recommendations.length === 0 ? (
        <Card className="p-12 text-center border-slate-200">
          <Award className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
          <h3 className="text-base font-semibold text-slate-900">Outstanding Academic Standing!</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            You currently have no courses flagged as Weak or Below Passing Threshold. All evaluated courses are performing strongly (&ge; 70%).
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {recommendations.map((rec) => {
            const isHigh = rec.priority === 'High';
            return (
              <Card key={rec.courseCode} className="p-6 border-slate-200 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {rec.courseCode}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isHigh
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {rec.priority} Revision Priority ({rec.percentage}%)
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {rec.courseName}
                    </h3>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Recommended Weekly Effort: <strong>{isHigh ? '4-5 hrs' : '2-3 hrs'}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
                  {/* Priority Syllabus Topics */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      Priority Syllabus Topics
                    </h4>
                    <p className="text-xs text-slate-500">
                      Master each unit and check off topics as you complete revision sessions:
                    </p>
                    <div className="space-y-2 mt-2">
                      {rec.topics.map((topic, i) => {
                        const key = `${rec.courseCode}_${topic}`;
                        const isDone = !!completedTopics[key];
                        return (
                          <div
                            key={i}
                            onClick={() => toggleTopic(key)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                              isDone
                                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                                : 'bg-slate-50/60 border-slate-200 hover:border-indigo-300 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isDone
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </div>
                              <span className={isDone ? 'line-through text-slate-400' : 'font-medium'}>
                                {topic}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {isDone ? 'Mastered' : 'Pending'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Curated Verified Resources */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Verified Educational Resources (Direct Links)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Direct individual lectures, verified YouTube tutorials & official university materials:
                    </p>
                    <div className="space-y-3 mt-2">
                      {rec.resources.map((res, i) => {
                        const isVideo = res.type === 'Video Lessons';
                        return (
                          <div
                            key={i}
                            className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    isVideo
                                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                      : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                                  }`}
                                >
                                  {isVideo ? <PlayCircle size={16} /> : <FileText size={16} />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                        isVideo
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-indigo-100 text-indigo-800'
                                      }`}
                                    >
                                      {res.type}
                                    </span>
                                    {res.isVerifiedDbResource && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <ShieldCheck size={10} />
                                        Verified
                                      </span>
                                    )}
                                    {res.duration && (
                                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Clock size={10} />
                                        {res.duration}
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-xs font-bold text-slate-900 mt-1 leading-snug">
                                    {res.title}
                                  </h5>
                                  {res.channel && (
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                      Instructor / Source: <span className="text-slate-700">{res.channel}</span>
                                    </p>
                                  )}
                                  {res.description && (
                                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                      {res.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 italic">
                                {isVideo ? 'Direct YouTube Lecture' : 'Direct Study Reference'}
                              </span>
                              <a
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                  isVideo
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                }`}
                              >
                                <span>{isVideo ? 'Watch Specific Video' : 'Open Resource'}</span>
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
