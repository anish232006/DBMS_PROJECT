import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

// Singleton toast store
let listeners: ((toasts: ToastMessage[]) => void)[] = [];
let toasts: ToastMessage[] = [];

function notify(toast: Omit<ToastMessage, 'id'>) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { ...toast, id }];
  listeners.forEach((fn) => fn(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((fn) => fn(toasts));
  }, 4000);
}

export const toast = {
  success: (title: string, message?: string) => notify({ type: 'success', title, message }),
  error: (title: string, message?: string) => notify({ type: 'error', title, message }),
  warning: (title: string, message?: string) => notify({ type: 'warning', title, message }),
  info: (title: string, message?: string) => notify({ type: 'info', title, message }),
};

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-emerald-500" />,
  error: <XCircle size={18} className="text-red-500" />,
  warning: <AlertCircle size={18} className="text-amber-500" />,
  info: <Info size={18} className="text-blue-500" />,
};

const borders: Record<ToastType, string> = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
};

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const fn = (t: ToastMessage[]) => setCurrentToasts([...t]);
    listeners.push(fn);
    return () => { listeners = listeners.filter((l) => l !== fn); };
  }, []);

  if (currentToasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 min-w-[320px] max-w-[400px]">
      {currentToasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'bg-white rounded-xl shadow-xl border border-slate-100 border-l-4 p-4 flex items-start gap-3 animate-fade-in',
            borders[t.type]
          )}
        >
          <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">{t.title}</p>
            {t.message && <p className="text-xs text-slate-500 mt-0.5">{t.message}</p>}
          </div>
          <button
            onClick={() => {
              toasts = toasts.filter((x) => x.id !== t.id);
              listeners.forEach((fn) => fn(toasts));
            }}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
