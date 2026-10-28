import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getStatusColor(status: string): string {
  const s = status?.toLowerCase();
  if (['active', 'approved', 'present', 'pass', 'selected', 'returned', 'resolved', 'paid'].includes(s))
    return 'green';
  if (['pending', 'in_progress', 'issued', 'late', 'applied', 'shortlisted'].includes(s))
    return 'yellow';
  if (['inactive', 'rejected', 'absent', 'fail', 'overdue', 'open'].includes(s))
    return 'red';
  return 'slate';
}
