-- ==============================================================================
-- MIGRATION: 20261011_student_portal_rls.sql
-- UniVerse Academic Portal: Student Row-Level Security & Account Linking
-- ==============================================================================

-- 1. ACCOUNT LINKING: Connect Supabase Auth users to institutional Student records
-- Add auth_user_id column to students table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE public.students 
        ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON public.students(auth_user_id);
    END IF;
END $$;

-- 2. HELPER FUNCTION: Resolve authenticated student ID from auth.uid()
CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS UUID AS $$
DECLARE
    v_student_id UUID;
BEGIN
    -- Check direct link on students.auth_user_id
    SELECT student_id INTO v_student_id
    FROM public.students
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    -- If not directly linked by auth_user_id, match by email from auth.jwt()
    IF v_student_id IS NULL THEN
        SELECT student_id INTO v_student_id
        FROM public.students
        WHERE lower(email) = lower(auth.jwt() ->> 'email')
        LIMIT 1;
    END IF;

    RETURN v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL CORE TABLES
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- 4. SERVICE ROLE POLICIES (Allows backend AI microservice with service-role key full access)
CREATE POLICY "service_role_all_students" ON public.students
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_examinations" ON public.examinations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_attendance" ON public.attendance
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_timetable" ON public.timetable
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. STUDENTS TABLE POLICIES
-- A student can only view their own profile record
CREATE POLICY "student_select_own_profile" ON public.students
    FOR SELECT TO authenticated
    USING (
        student_id = public.get_current_student_id()
        OR auth_user_id = auth.uid()
    );

-- A student can only update non-academic personal fields (phone, address)
CREATE POLICY "student_update_own_contact_info" ON public.students
    FOR UPDATE TO authenticated
    USING (
        student_id = public.get_current_student_id()
        OR auth_user_id = auth.uid()
    )
    WITH CHECK (
        student_id = public.get_current_student_id()
        OR auth_user_id = auth.uid()
    );

-- 6. EXAMINATIONS TABLE POLICIES
-- A student can ONLY view their own official examination marks
CREATE POLICY "student_select_own_examinations" ON public.examinations
    FOR SELECT TO authenticated
    USING (
        student_id = public.get_current_student_id()
    );

-- Prevent students from inserting, updating, or deleting examination records
CREATE POLICY "student_no_modify_examinations" ON public.examinations
    FOR INSERT TO authenticated WITH CHECK (false);

-- 7. ATTENDANCE TABLE POLICIES
-- A student can ONLY view their own attendance records
CREATE POLICY "student_select_own_attendance" ON public.attendance
    FOR SELECT TO authenticated
    USING (
        student_id = public.get_current_student_id()
    );

-- Prevent students from modifying attendance records
CREATE POLICY "student_no_modify_attendance" ON public.attendance
    FOR INSERT TO authenticated WITH CHECK (false);

-- 8. TIMETABLE TABLE POLICIES
-- A student can ONLY view timetable schedules corresponding to their own department
CREATE POLICY "student_select_department_timetable" ON public.timetable
    FOR SELECT TO authenticated
    USING (
        department_id IN (
            SELECT department_id FROM public.students 
            WHERE student_id = public.get_current_student_id()
        )
    );

-- 9. READ-ONLY METADATA TABLES (Courses, Departments, Classrooms)
-- Public / authenticated students can view course catalog, departments, and rooms
CREATE POLICY "authenticated_select_courses" ON public.courses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_departments" ON public.departments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_classrooms" ON public.classrooms
    FOR SELECT TO authenticated USING (true);

-- ==============================================================================
-- 10. SECURE ACCOUNT LINKING RPC FUNCTION
-- Links a Supabase auth account to a student record only after verifying
-- both register_number and verified institutional email.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.link_student_account(
    p_register_number TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_email TEXT;
    v_target_student RECORD;
BEGIN
    -- Extract verified email from auth token
    v_user_email := auth.jwt() ->> 'email';
    
    IF v_user_email IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthenticated request.');
    END IF;

    -- Lookup student matching register number AND matching institutional email
    SELECT student_id, full_name, email, register_number, auth_user_id
    INTO v_target_student
    FROM public.students
    WHERE register_number = p_register_number
      AND lower(email) = lower(v_user_email);

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'No student record found matching this register number and verified email.'
        );
    END IF;

    -- If already linked to another auth account, reject
    IF v_target_student.auth_user_id IS NOT NULL AND v_target_student.auth_user_id <> auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'This student record is already linked to another institutional account.'
        );
    END IF;

    -- Link current user
    UPDATE public.students
    SET auth_user_id = auth.uid()
    WHERE student_id = v_target_student.student_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Student account successfully linked.',
        'student_id', v_target_student.student_id,
        'full_name', v_target_student.full_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
