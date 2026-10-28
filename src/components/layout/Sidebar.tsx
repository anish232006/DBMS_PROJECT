import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, BookOpen, UserCheck, DoorOpen,
  Calendar, CheckSquare, Award, Clock, Briefcase,
  Building2, Home, Star, Zap, Trophy,
  Library, Bus, Heart, LogIn,
  Factory, Coins, Package, MessageSquare, ThumbsUp,
  GraduationCap, ChevronDown, ChevronRight, X, Brain,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  color: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Academic',
    color: 'text-blue-600',
    items: [
      { label: 'Dashboard', path: '/management', icon: <LayoutDashboard size={16} /> },
      { label: 'AI Performance', path: '/management/ai-analytics', icon: <Brain size={16} /> },
      { label: 'Students', path: '/management/students', icon: <Users size={16} /> },
      { label: 'Admissions', path: '/management/admissions', icon: <ClipboardList size={16} /> },
      { label: 'Departments', path: '/management/departments', icon: <Building2 size={16} /> },
      { label: 'Courses', path: '/management/courses', icon: <BookOpen size={16} /> },
      { label: 'Faculty', path: '/management/faculty', icon: <UserCheck size={16} /> },
      { label: 'Classrooms', path: '/management/classrooms', icon: <DoorOpen size={16} /> },
      { label: 'Enrollments', path: '/management/enrollments', icon: <ClipboardList size={16} /> },
      { label: 'Attendance', path: '/management/attendance', icon: <CheckSquare size={16} /> },
      { label: 'Examinations', path: '/management/examinations', icon: <Award size={16} /> },
      { label: 'Timetable', path: '/management/timetable', icon: <Calendar size={16} /> },
      { label: 'Faculty Workload', path: '/management/faculty-workload', icon: <Clock size={16} /> },
    ],
  },
  {
    title: 'Campus',
    color: 'text-emerald-600',
    items: [
      { label: 'Hostel Rooms', path: '/management/hostel-rooms', icon: <Home size={16} /> },
      { label: 'Hostel Allocations', path: '/management/hostel-allocations', icon: <Building2 size={16} /> },
      { label: 'Clubs', path: '/management/clubs', icon: <Star size={16} /> },
      { label: 'Club Memberships', path: '/management/club-memberships', icon: <Zap size={16} /> },
      { label: 'Events', path: '/management/events', icon: <Calendar size={16} /> },
      { label: 'Event Participants', path: '/management/event-participants', icon: <Users size={16} /> },
      { label: 'Sports Teams', path: '/management/sports-teams', icon: <Trophy size={16} /> },
      { label: 'Sports Participation', path: '/management/sports-participation', icon: <Trophy size={16} /> },
    ],
  },
  {
    title: 'Support',
    color: 'text-purple-600',
    items: [
      { label: 'Library Books', path: '/management/library-books', icon: <Library size={16} /> },
      { label: 'Library Transactions', path: '/management/library-transactions', icon: <BookOpen size={16} /> },
      { label: 'Transport Routes', path: '/management/transport-routes', icon: <Bus size={16} /> },
      { label: 'Transport Allocs.', path: '/management/transport-allocations', icon: <Bus size={16} /> },
      { label: 'Health Records', path: '/management/health-records', icon: <Heart size={16} /> },
      { label: 'Visitor Logs', path: '/management/visitor-logs', icon: <LogIn size={16} /> },
    ],
  },
  {
    title: 'Career',
    color: 'text-amber-600',
    items: [
      { label: 'Companies', path: '/management/companies', icon: <Factory size={16} /> },
      { label: 'Placement Drives', path: '/management/placement-drives', icon: <Briefcase size={16} /> },
      { label: 'Applications', path: '/management/placement-applications', icon: <ClipboardList size={16} /> },
      { label: 'Research Projects', path: '/management/research-projects', icon: <GraduationCap size={16} /> },
      { label: 'Research Participants', path: '/management/research-participants', icon: <Users size={16} /> },
      { label: 'Alumni', path: '/management/alumni', icon: <GraduationCap size={16} /> },
    ],
  },
  {
    title: 'Admin',
    color: 'text-red-600',
    items: [
      { label: 'Fee Structure', path: '/management/fee-structure', icon: <Coins size={16} /> },
      { label: 'Finance', path: '/management/finance', icon: <Coins size={16} /> },
      { label: 'Inventory', path: '/management/inventory', icon: <Package size={16} /> },
      { label: 'Grievances', path: '/management/grievances', icon: <MessageSquare size={16} /> },
      { label: 'Feedback', path: '/management/feedback', icon: <ThumbsUp size={16} /> },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const location = useLocation();

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const sidebarContent = (
    <nav className="h-full flex flex-col bg-white border-r border-slate-100 overflow-hidden">
      {/* Karunya Logo Branding */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-100 flex-shrink-0 bg-white select-none">
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M50 10 L85 25 L80 65 C75 85 50 95 50 95 C50 95 25 85 20 65 L15 25 Z" fill="#0c2d57" />
            <path d="M50 15 L80 28 L75 62 C70 80 50 88 50 88 C50 88 30 80 25 62 L20 28 Z" fill="#fcfcfc" />
            <path d="M50 20 C60 20 70 30 70 45 C70 60 50 75 50 75 C50 75 30 60 30 45 C30 30 40 20 50 20 Z" fill="#e2f1ff" />
            <circle cx="50" cy="40" r="12" fill="#009bf2" />
            <path d="M40 50 Q50 60 60 50 L50 70 Z" fill="#ff7f11" />
          </svg>
        </div>
        <div className="overflow-hidden">
          <p className="text-[#0c2d57] font-extrabold text-base tracking-wide leading-none" style={{ fontFamily: 'Georgia, serif' }}>Karunya</p>
          <p className="text-[#0c2d57] font-bold text-[6px] tracking-tight uppercase leading-tight mt-0.5">Institute of Technology and Sciences</p>
          <p className="text-slate-455 font-semibold text-[5px] uppercase tracking-tighter leading-none">(Deemed to be University)</p>
        </div>
        {/* Mobile close */}
        <button
          onClick={onClose}
          className="ml-auto p-1 text-slate-400 hover:text-slate-600 lg:hidden flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav sections list */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
        {NAV_SECTIONS.map((section) => {
          const isCollapsed = collapsed[section.title];
          return (
            <div key={section.title} className="space-y-1">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-50/85 transition-colors group"
              >
                <span className={cn('text-[10px] font-bold uppercase tracking-wider', section.color)}>
                  {section.title}
                </span>
                {isCollapsed
                  ? <ChevronRight size={12} className="text-slate-450" />
                  : <ChevronDown size={12} className="text-slate-450" />}
              </button>
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = item.path === '/management'
                      ? location.pathname === '/management' || location.pathname === '/management/'
                      : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 group',
                          isActive
                            ? 'bg-[#009bf2] text-white shadow-sm shadow-[#009bf2]/10 font-semibold'
                            : 'text-slate-655 hover:text-slate-900 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={cn(
                            'flex-shrink-0 transition-colors',
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'
                          )}>
                            {item.icon}
                          </span>
                          <span className="truncate font-medium">{item.label}</span>
                        </div>
                        <ChevronRight size={12} className={cn(
                          'flex-shrink-0 transition-all',
                          isActive ? 'text-blue-100 opacity-100' : 'text-slate-350 opacity-0 group-hover:opacity-100'
                        )} />
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Branding matching "ES Edu Serve" */}
      <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0 bg-slate-50/50 flex items-center gap-2">
        <div className="w-6 h-6 bg-[#0c2d57] rounded flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[10px] font-bold">ES</span>
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-700 leading-tight">ES</p>
          <p className="text-[8px] text-slate-450 font-semibold leading-none">Edu Serve</p>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <aside className="relative w-60 h-full z-50 animate-slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
