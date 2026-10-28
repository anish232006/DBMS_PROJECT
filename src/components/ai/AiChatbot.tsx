import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, Sparkles, RefreshCw,
  Database, Minimize2,
} from 'lucide-react';
import { aiApiClient, type ChatMessage } from '../../ai/services/aiApiClient';
import { useAuth } from '../../context/AuthContext';
import { MarkdownMessage } from '../common/MarkdownMessage';

const SUGGESTED_QUESTIONS = [
  'What is my mark in Data Structures?',
  'What are my marks in all subjects?',
  'What is my attendance status and do I have warnings?',
  'Which hostel room am I in and what are the curfew rules?',
  'What placement drives and club activities are open?',
  'Recommend a weekly study plan to clear arrears',
];

export function AiChatbot({ studentId }: { studentId?: string } = {}) {
  const { student } = useAuth();
  const effectiveStudentId = studentId || student?.register_number || student?.student_id;

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<ChatMessage & { grounded?: boolean; sources?: string[] }>>([
    {
      role: 'assistant',
      content: student
        ? `👋 Hello **${student.full_name}**! I am your **UniVerse AI Study Assistant**.\n\nI have complete access to your verified academic records, examination marks, subject attendance, class timetable, hostel accommodations, and campus resources.\n\nHow can I help you today?`
        : '👋 Hello! I am **UniVerse AI**, your complete university portal assistant grounded directly in verified institutional records.\n\nHow can I assist you today?',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Pass last 6 messages as context history
      const historyContext = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await aiApiClient.sendChatMessage(
        text,
        historyContext,
        effectiveStudentId
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
          content: `⚠️ **Connection Error**: ${err?.message || 'Unable to reach AI assistant service'}. Please verify that the backend is running at http://localhost:8000.`,
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
        content: 'Conversation history cleared. How can I assist you?',
      },
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 group border border-purple-400/30"
          aria-label="Open AI University Assistant"
        >
          <div className="relative">
            <Bot size={22} className="text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-purple-600 animate-pulse" />
          </div>
          <span className="font-semibold text-sm hidden sm:inline">Ask UniVerse AI</span>
          <Sparkles size={14} className="text-purple-200 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[440px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm">UniVerse AI Assistant</h3>
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-200">
                    Groq LLM
                  </span>
                </div>
                <p className="text-[11px] text-purple-200 flex items-center gap-1">
                  <Database size={10} /> Grounded in Database Records
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                title="Clear conversation"
                className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 flex-shrink-0 mt-0.5">
                    <Bot size={15} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  <MarkdownMessage content={m.content} isUser={m.role === 'user'} />

                  {/* Grounding Source Badge */}
                  {m.grounded && m.sources && m.sources.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1">
                      <Database size={9} className="text-purple-500" />
                      <span>Verified: {m.sources.join(', ')}</span>
                    </div>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                    <User size={15} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 flex-shrink-0">
                  <Bot size={15} />
                </div>
                <div className="bg-white text-slate-600 border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-slate-400 ml-2">Consulting university records...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestions */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-slate-100 border-t border-slate-200 overflow-x-auto">
              <p className="text-[10px] text-slate-500 font-semibold mb-1.5 flex items-center gap-1">
                <Sparkles size={10} className="text-purple-600" /> Suggested Inquiries:
              </p>
              <div className="flex gap-1.5 whitespace-nowrap overflow-x-auto pb-1">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-full text-slate-700 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about marks, attendance, timetable, hostels, placements..."
              disabled={loading}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-600 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
