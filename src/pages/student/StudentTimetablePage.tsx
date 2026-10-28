import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  MapPin,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';

interface TimetableItem {
  timetable_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  semester_section?: string | null;
  course_code: string;
  courses?: {
    course_name?: string;
    credits?: number;
  } | null;
  classrooms?: {
    room_number?: string;
    building?: string;
  } | null;
  faculty?: {
    full_name?: string;
  } | null;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetablePage() {
  const { student } = useAuth();
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  const {
    data: timetable = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<TimetableItem[]>({
    queryKey: ['student-timetable-full', student?.department_id, student?.current_semester],
    queryFn: async () => {
      if (!student?.department_id) return [];
      const { data, error } = await supabase
        .from('timetable')
        .select(`
          timetable_id,
          day_of_week,
          start_time,
          end_time,
          semester_section,
          course_code,
          courses(course_name, credits),
          classrooms(room_number, building),
          faculty(full_name)
        `)
        .eq('department_id', student.department_id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return (data || []) as TimetableItem[];
    },
    enabled: !!student?.department_id,
  });

  const daySchedule = timetable.filter(
    (item) => item.day_of_week.toLowerCase() === selectedDay.toLowerCase()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Calendar className="w-7 h-7 text-indigo-600" />
          Academic Timetable
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Weekly lecture and laboratory schedule for {student?.department || 'Department'} (Semester {student?.current_semester || 'N/A'}).
        </p>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {DAYS_OF_WEEK.map((day) => {
          const count = timetable.filter(
            (t) => t.day_of_week.toLowerCase() === day.toLowerCase()
          ).length;
          const isSelected = selectedDay.toLowerCase() === day.toLowerCase();

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{day}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Schedule List */}
      <Card className="p-6 border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {selectedDay}'s Classes
            </h3>
            <p className="text-xs text-slate-500">
              {daySchedule.length} session{daySchedule.length === 1 ? '' : 's'} scheduled for this day
            </p>
          </div>
          <div className="text-xs font-medium text-slate-400">
            Section: {student?.current_semester ? `Semester ${student.current_semester}` : 'Department Default'}
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Loading timetable from database...
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-rose-500 text-sm">
            Failed to load timetable records.
            <button onClick={() => refetch()} className="ml-2 text-indigo-600 underline">Retry</button>
          </div>
        ) : daySchedule.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">No classes scheduled on {selectedDay}</p>
            <p className="text-xs text-slate-400 mt-1">
              No entries recorded in the department timetable for this day.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 mt-2">
            {daySchedule.map((item) => (
              <div
                key={item.timetable_id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 rounded-lg px-2 transition-colors"
              >
                {/* Time & Course Badge */}
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center justify-center p-2.5 bg-indigo-50 text-indigo-700 rounded-xl min-w-[100px] text-center border border-indigo-100/60">
                    <Clock className="w-4 h-4 mb-1 text-indigo-600" />
                    <span className="text-xs font-bold font-mono">
                      {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded">
                        {item.course_code}
                      </span>
                      {item.courses?.credits && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          ({item.courses.credits} Credits)
                        </span>
                      )}
                      {item.semester_section && (
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                          Sec {item.semester_section}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 mt-1">
                      {item.courses?.course_name || 'Course Lecture'}
                    </h4>
                  </div>
                </div>

                {/* Classroom and Faculty Details */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 md:self-center">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {item.classrooms?.room_number
                        ? `Room ${item.classrooms.room_number} (${item.classrooms.building || 'Campus'})`
                        : 'Classroom Assigned'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{item.faculty?.full_name || 'Faculty Member'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
