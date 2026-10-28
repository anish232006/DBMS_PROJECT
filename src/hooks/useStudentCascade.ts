import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export function useStudentCascade(deptId: string, section: string) {
  // 1. Departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('department_id, department_name')
        .order('department_name');

      if (error) throw error;

      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Sections
  const { data: rawSections = [] } = useQuery({
    queryKey: ['timetable-sections', deptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timetable')
        .select('semester_section')
        .eq('department_id', deptId)
        .not('semester_section', 'is', null);

      if (error) throw error;

      const unique = [
        ...new Set(
          (data ?? [])
            .map((r: any) => r.semester_section as string)
            .filter(Boolean)
        ),
      ].sort();

      return unique;
    },
    enabled: !!deptId,
    staleTime: 2 * 60 * 1000,
  });

  // 3. Students
  //
  // The students table uses:
  // student_id
  // register_number
  // full_name
  // department_id
  // current_semester
  // status
  //
  // IMPORTANT:
  // Status values in the database are "Active", not "active".
  //
  // Students are filtered by department.
  // The section is taken from timetable because the students table
  // does not have a section column.

  const { data: students = [] } = useQuery({
    queryKey: ['students-cascade', deptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(
          'student_id, full_name, register_number, current_semester, status'
        )
        .eq('department_id', deptId)
.ilike('status', 'active')
        .order('register_number');

      if (error) throw error;

      return data ?? [];
    },
    enabled: !!deptId,
    staleTime: 2 * 60 * 1000,
  });

  const deptOptions = departments.map((d: any) => ({
    value: d.department_id,
    label: d.department_name,
  }));

  const sectionOptions = rawSections.map((s: string) => ({
    value: s,
    label: s,
  }));

  const studentOptions = students.map((s: any) => ({
    value: s.student_id,
    label: `${s.full_name} (${s.register_number})`,
  }));

  return {
    deptOptions,
    sectionOptions,
    studentOptions,
  };
}