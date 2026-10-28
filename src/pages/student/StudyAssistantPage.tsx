import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  Sparkles,
  RefreshCw,
  Database,
  Trash2,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { aiApiClient, type ChatMessage } from '../../ai/services/aiApiClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MarkdownMessage } from '../../components/common/MarkdownMessage';

const PROMPT_SUGGESTIONS = [
  {
    title: 'Subject Marks Inquiry',
    prompt: 'What is my mark and grade in Data Structures (CO301)?',
  },
  {
    title: 'All Examination Results',
    prompt: 'Give me a complete breakdown of all my examination marks, grades, and arrears.',
  },
  {
    title: 'Attendance Check',
    prompt: 'What is my current attendance percentage and do I have any warnings?',
  },
  {
    title: 'Personalized Study Plan',
    prompt: 'Create a realistic 7-day study schedule focused on clearing my arrears.',
  },
  {
    title: 'Upcoming Timetable',
    prompt: 'Summarize my weekly schedule and any upcoming lectures.',
  },
];

export default function StudyAssistantPage() {
  const { student } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<ChatMessage & { grounded?: boolean; sources?: string[] }>>([
    {
      role: 'assistant',
      content: student
        ? `👋 Greetings **${student.full_name}**!\n\nI am your dedicated **UniVerse AI Study Assistant**, connected securely to your personal institutional records (${student.register_number} • ${student.department || 'Department'}).\n\nI can analyze your examination marks, break down complex course concepts, check your attendance eligibility, and generate personalized revision timetables.\n\nWhat would you like to work on today?`
        : '👋 Greetings! I am your UniVerse AI Study Assistant.',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const historyContext = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await aiApiClient.sendChatMessage(
        text,
        historyContext,
        student?.register_number || student?.student_id
      );

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.response,
          grounded: res.grounded_in_db,
          sources: res.context_sources,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Service Notice**: ${err?.message || 'Unable to connect to AI engine'}. If the backend is running at http://localhost:8000, please verify network connectivity or try again in a moment.`,
          grounded: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Chat session reset. How can I assist you with your studies, **${student?.full_name || 'student'}**?`,
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-indigo-600" />
            AI Academic Study Assistant
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Grounded LLM dialogue powered by Groq & real university data for {student?.full_name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClear}
            className="text-xs text-slate-600 border-slate-200"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Clear Session
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chat Interface (3 cols) */}
        <div className="lg:col-span-3 flex flex-col h-[700px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Chat Header Bar */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">UniVerse Assistant Engine</h3>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Grounded strictly in records of {student?.register_number}
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
              Student ID: {student?.register_number || 'N/A'}
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-xs'
                          : 'bg-white text-slate-850 border border-slate-200/90 rounded-tl-xs shadow-xs'
                      }`}
                    >
                      <MarkdownMessage content={msg.content} isUser={isUser} />
                    </div>

                    {!isUser && msg.grounded && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 pl-1">
                        <Database className="w-3 h-3" />
                        <span>Verified against Supabase institutional records</span>
                        {msg.sources && msg.sources.length > 0 && (
                          <span className="text-slate-400">({msg.sources.join(', ')})</span>
                        )}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white flex-shrink-0 mt-0.5 text-xs font-bold">
                      {student?.full_name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  Retrieving student records and generating personalized guidance...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="relative">
              <textarea
                ref={inputRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your marks, syllabus revision, attendance, or upcoming classes..."
                disabled={loading}
                className="w-full resize-none rounded-xl border border-slate-300 p-3 pr-14 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="absolute right-2.5 bottom-3.5 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Responses are tailored to your personal records. Press Enter to send, Shift+Enter for new line.
            </p>
          </div>
        </div>

        {/* Sidebar Prompts & Guidance (1 col) */}
        <div className="space-y-4">
          <Card className="p-4 border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Suggested Queries
            </h4>
            <div className="space-y-2">
              {PROMPT_SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  disabled={loading}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/50 transition-all group"
                >
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 flex items-center justify-between">
                    <span>{item.title}</span>
                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    "{item.prompt}"
                  </p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 border-slate-200 bg-indigo-50/30">
            <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Study Assistant Capabilities
            </h4>
            <ul className="text-xs text-indigo-950/80 space-y-2 mt-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                <span><strong>Exam Analysis:</strong> Dissects weak subjects and calculates score gaps.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                <span><strong>Study Plans:</strong> Builds realistic schedules balancing coursework.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                <span><strong>Concept Explainer:</strong> Explains engineering concepts with simplified analogies.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                <span><strong>Attendance Auditing:</strong> Flags shortage risks against the 75% rule.</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
