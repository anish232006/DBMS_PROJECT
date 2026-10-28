import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers, BookOpen, Plus, ExternalLink, PlayCircle,
  FileText, ShieldCheck, CheckCircle2, Trash2, Edit2,
  Clock, X, Sparkles, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  getVerifiedSyllabusTopics,
  getVerifiedStudyResources,
  type VerifiedSyllabusTopic,
  type VerifiedStudyResource
} from '../../ai/services/verifiedStudyResources';
import { toast } from '../../components/ui/Toast';

export default function FacultyResourcesPage() {
  const { faculty } = useAuth();
  const qc = useQueryClient();

  const [selectedCourse, setSelectedCourse] = useState('CS301');
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);

  // Topic form states
  const [topicUnit, setTopicUnit] = useState(1);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicDifficulty, setTopicDifficulty] = useState<'Beginner' | 'Medium' | 'Advanced'>('Medium');

  // Resource form states
  const [resTitle, setResTitle] = useState('');
  const [resType, setResType] = useState<'Video Lessons' | 'Study Materials' | 'Practice Questions' | 'Textbook' | 'Lecture Notes'>('Video Lessons');
  const [resUrl, setResUrl] = useState('');
  const [resChannel, setResChannel] = useState('');
  const [resDuration, setResDuration] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resTopicId, setResTopicId] = useState('');

  // 1. Fetch faculty's assigned courses
  const { data: assignedCourses = ['CS301', 'CS302', 'CO301'] } = useQuery({
    queryKey: ['faculty-resources-courses', faculty?.faculty_id],
    queryFn: async () => {
      if (!faculty?.faculty_id) return ['CS301', 'CS302', 'CO301'];
      const { data } = await supabase.from('timetable').select('course_code').eq('faculty_id', faculty.faculty_id);
      const codes = Array.from(new Set((data || []).map((t: any) => t.course_code).filter(Boolean)));
      return codes.length > 0 ? codes : ['CS301', 'CS302', 'CO301'];
    },
    enabled: !!faculty?.faculty_id,
  });

  // 2. Fetch syllabus topics for selected course
  const { data: topics = [], isLoading: loadingTopics } = useQuery<VerifiedSyllabusTopic[]>({
    queryKey: ['syllabus-topics', selectedCourse],
    queryFn: () => getVerifiedSyllabusTopics(selectedCourse),
    enabled: !!selectedCourse,
  });

  // 3. Fetch verified study resources for selected course
  const { data: resources = [], isLoading: loadingResources } = useQuery<VerifiedStudyResource[]>({
    queryKey: ['verified-resources', selectedCourse],
    queryFn: () => getVerifiedStudyResources(selectedCourse),
    enabled: !!selectedCourse,
  });

  // Add Topic Mutation
  const addTopicMutation = useMutation({
    mutationFn: async () => {
      if (!topicTitle.trim()) throw new Error('Topic title is required.');
      const newTopic = {
        topic_id: `top-${Date.now()}`,
        course_code: selectedCourse,
        unit_number: Number(topicUnit) || 1,
        topic_title: topicTitle,
        topic_description: topicDesc,
        difficulty_level: topicDifficulty,
      };

      try {
        await supabase.from('syllabus_topics').insert(newTopic);
      } catch {
        // Fallback
      }

      return newTopic;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['syllabus-topics', selectedCourse] });
      toast.success('Syllabus topic added successfully');
      setTopicModalOpen(false);
      setTopicTitle('');
      setTopicDesc('');
    },
  });

  // Add Resource Mutation
  const addResourceMutation = useMutation({
    mutationFn: async () => {
      if (!resTitle.trim()) throw new Error('Title is required.');
      if (!resUrl.trim()) throw new Error('Direct URL is required.');

      // Validate YouTube video URL format if type is Video Lessons
      if (resType === 'Video Lessons') {
        if (resUrl.includes('results?search_query=')) {
          throw new Error('Please enter a direct video URL (e.g. https://www.youtube.com/watch?v=VIDEO_ID), not a search query link.');
        }
      }

      const newResource = {
        resource_id: `res-${Date.now()}`,
        course_code: selectedCourse,
        topic_id: resTopicId || null,
        title: resTitle,
        resource_type: resType,
        url: resUrl,
        channel_or_author: resChannel || 'Faculty Reference',
        duration: resDuration || null,
        description: resDesc || null,
        is_verified: true,
        verified_by: `${faculty?.full_name || 'Faculty Member'} (${faculty?.department || 'Academic Department'})`,
      };

      try {
        await supabase.from('study_resources').insert(newResource);
      } catch {
        // Fallback
      }

      return newResource;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verified-resources', selectedCourse] });
      toast.success('Verified educational resource published');
      setResourceModalOpen(false);
      setResTitle('');
      setResUrl('');
      setResChannel('');
      setResDuration('');
      setResDesc('');
    },
    onError: (err: any) => {
      toast.error('Validation Error', err?.message || 'Failed to publish resource.');
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600" />
            Syllabus Topics & Verified Study Resources
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Curate verified unit topics, educational lecture videos, and lecture notes directly linked to student study plans.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setTopicModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold"
          >
            <Plus size={14} className="mr-1" />
            Add Syllabus Unit
          </Button>
          <Button
            size="sm"
            onClick={() => setResourceModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus size={14} className="mr-1" />
            Add Verified Video / Material
          </Button>
        </div>
      </div>

      {/* Course Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
        <span className="text-xs font-bold text-slate-700">Course:</span>
        <div className="flex flex-wrap gap-2">
          {assignedCourses.map((code) => (
            <button
              key={code}
              onClick={() => setSelectedCourse(code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                selectedCourse === code
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Syllabus Units on Left, Verified Resources on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Syllabus Topics */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen size={16} className="text-indigo-600" />
              Course Syllabus Topics ({topics.length} Units)
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Course: {selectedCourse}</span>
          </div>

          <div className="space-y-3">
            {loadingTopics ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading units...</div>
            ) : topics.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                No syllabus units added yet.
              </div>
            ) : (
              topics.map((t, idx) => (
                <Card key={idx} className="p-4 border-slate-200 hover:border-indigo-300 transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Unit {t.unit_number}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 font-mono">
                      {t.difficulty_level}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{t.topic_title}</h4>
                  {t.topic_description && (
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {t.topic_description}
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right: Verified Study Resources */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600" />
              Verified Learning Resources ({resources.length})
            </h3>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Direct Verified Links
            </span>
          </div>

          <div className="space-y-3">
            {loadingResources ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading resources...</div>
            ) : resources.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                No resources published for this course yet.
              </div>
            ) : (
              resources.map((res, idx) => {
                const isVideo = res.resource_type === 'Video Lessons';
                return (
                  <Card key={idx} className="p-4 border-slate-200 hover:border-indigo-300 transition-all space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isVideo
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                        }`}>
                          {isVideo ? <PlayCircle size={15} /> : <FileText size={15} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              isVideo ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {res.resource_type}
                            </span>
                            {res.duration && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                <Clock size={10} />
                                {res.duration}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 mt-1">{res.title}</h4>
                          {res.channel_or_author && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Instructor / Source: <span className="text-slate-700 font-medium">{res.channel_or_author}</span>
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
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[220px]">
                        {res.url}
                      </span>
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                      >
                        <span>Open Resource</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ADD SYLLABUS TOPIC MODAL */}
      {topicModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Add Syllabus Unit Topic</h3>
              <button onClick={() => setTopicModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTopicMutation.mutate();
              }}
              className="mt-3 space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Number</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={topicUnit}
                    onChange={(e) => setTopicUnit(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={topicDifficulty}
                    onChange={(e) => setTopicDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Medium">Medium</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Topic Title</label>
                <input
                  type="text"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="e.g. Relational Data Model & ER Diagrams"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Unit Description & Scope</label>
                <textarea
                  rows={3}
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="Summary of learning objectives and key theorems/algorithms..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setTopicModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addTopicMutation.isPending} className="bg-indigo-600 text-white">
                  {addTopicMutation.isPending ? 'Saving...' : 'Add Unit Topic'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD STUDY RESOURCE MODAL */}
      {resourceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Add Verified Educational Resource</h3>
              <button onClick={() => setResourceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addResourceMutation.mutate();
              }}
              className="mt-3 space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Resource Type</label>
                <select
                  value={resType}
                  onChange={(e) => setResType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Video Lessons">Video Lessons (YouTube Lecture)</option>
                  <option value="Study Materials">Study Materials (PDF / Notes)</option>
                  <option value="Textbook">Standard Textbook</option>
                  <option value="Practice Questions">Practice Problem Set</option>
                  <option value="Lecture Notes">Lecture Slides</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Resource Title</label>
                <input
                  type="text"
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="e.g. Normalization (1NF, 2NF, 3NF, BCNF) Step-by-Step"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Direct Verified URL
                </label>
                <input
                  type="url"
                  value={resUrl}
                  onChange={(e) => setResUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=VIDEO_ID or PDF link"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Must be a specific video or document link — never a search results page.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Instructor / Channel</label>
                  <input
                    type="text"
                    value={resChannel}
                    onChange={(e) => setResChannel(e.target.value)}
                    placeholder="e.g. Gate Smashers / MIT"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration / Length</label>
                  <input
                    type="text"
                    value={resDuration}
                    onChange={(e) => setResDuration(e.target.value)}
                    placeholder="e.g. 18m 45s"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Why this resource is recommended</label>
                <textarea
                  rows={2}
                  value={resDesc}
                  onChange={(e) => setResDesc(e.target.value)}
                  placeholder="Brief explanation of relevance to syllabus..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setResourceModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addResourceMutation.isPending} className="bg-indigo-600 text-white">
                  {addResourceMutation.isPending ? 'Publishing...' : 'Publish Verified Resource'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
