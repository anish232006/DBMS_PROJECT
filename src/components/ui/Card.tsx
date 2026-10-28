import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ children, className, noPadding }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-100 shadow-sm',
        !noPadding && 'p-5',
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
}

export function CardHeader({ title, subtitle, actions, icon, iconColor = 'bg-blue-50 text-blue-600' }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-center gap-3">
        {icon && (
          <div className={cn('p-2 rounded-lg flex-shrink-0', iconColor)}>
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'red' | 'slate';
  isLoading?: boolean;
}

const statColors: Record<string, { bg: string; icon: string; text: string; trend: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-600', trend: 'text-blue-500' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-600', trend: 'text-emerald-500' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-600', trend: 'text-amber-500' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-600', trend: 'text-purple-500' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-600', trend: 'text-red-500' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600', text: 'text-slate-600', trend: 'text-slate-500' },
};

export function StatCard({ title, value, subtitle, icon, trend, color = 'blue', isLoading }: StatCardProps) {
  const c = statColors[color];
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow duration-200 group">
      <div className={cn('p-3 rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-200', c.bg)}>
        <span className={c.icon}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
        {isLoading ? (
          <div className="skeleton h-7 w-20 mt-1" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 mt-0.5 leading-tight">{value}</p>
        )}
        {subtitle && !isLoading && (
          <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>
        )}
        {trend && !isLoading && (
          <p className={cn('text-xs font-medium mt-1', c.trend)}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
