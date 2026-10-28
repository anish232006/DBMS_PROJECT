import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

/**
 * Shared hook – fetches the departments table once and caches it.
 * Returns { departments, deptOptions } where deptOptions is ready for <Select>.
 */
export function useDepartments() {
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
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  const deptOptions = departments.map((d: any) => ({
    value: d.department_id as string,
    label: d.department_name as string,
  }));

  return { departments, deptOptions };
}
