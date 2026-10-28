import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'slate' | 'purple' | 'orange';
  size?: 'sm' | 'md';
  className?: string;
}

const colorMap: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  yellow: 'bg-amber-100 text-amber-700 ring-amber-200',
  red: 'bg-red-100 text-red-600 ring-red-200',
  blue: 'bg-blue-100 text-blue-700 ring-blue-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  purple: 'bg-purple-100 text-purple-700 ring-purple-200',
  orange: 'bg-orange-100 text-orange-700 ring-orange-200',
};

export function Badge({ children, color = 'slate', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        colorMap[color] ?? colorMap.slate,
        className
      )}
    >
      {children}
    </span>
  );
}
