-- ==============================================================================
-- MIGRATION: 20261026_faculty_portal_and_study_resources.sql
-- UniVerse Academic Portal: Faculty Portal, Role-Based Access, Tasks, Payroll,
-- and Syllabus-Aware Study Resources & Direct Recommendations
-- ==============================================================================

-- 1. ACCOUNT LINKING FOR FACULTY: Connect Supabase Auth users to faculty records
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'faculty' AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE public.faculty 
        ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_faculty_auth_user_id ON public.faculty(auth_user_id);
    END IF;
END $$;

-- 2. HELPER FUNCTION: Resolve authenticated faculty ID from auth.uid()
CREATE OR REPLACE FUNCTION public.get_current_faculty_id()
RETURNS UUID AS $$
DECLARE
    v_faculty_id UUID;
BEGIN
    -- Check direct link on faculty.auth_user_id
    SELECT faculty_id INTO v_faculty_id
    FROM public.faculty
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    -- If not directly linked by auth_user_id, match by email from auth.jwt()
    IF v_faculty_id IS NULL THEN
        SELECT faculty_id INTO v_faculty_id
        FROM public.faculty
        WHERE lower(email) = lower(auth.jwt() ->> 'email')
        LIMIT 1;
    END IF;

    RETURN v_faculty_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. SYLLABUS TOPICS TABLE
CREATE TABLE IF NOT EXISTS public.syllabus_topics (
    topic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT NOT NULL REFERENCES public.courses(course_code) ON DELETE CASCADE,
    topic_title TEXT NOT NULL,
    topic_description TEXT,
    unit_number INT DEFAULT 1,
    learning_objectives TEXT,
    difficulty_level TEXT DEFAULT 'Medium' CHECK (difficulty_level IN ('Beginner', 'Medium', 'Advanced')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_syllabus_topics_course ON public.syllabus_topics(course_code);

-- 4. VERIFIED STUDY RESOURCES TABLE (Specific direct YouTube videos and study materials)
CREATE TABLE IF NOT EXISTS public.study_resources (
    resource_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT NOT NULL REFERENCES public.courses(course_code) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.syllabus_topics(topic_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('Video Lessons', 'Study Materials', 'Practice Questions', 'Textbook', 'Lecture Notes')),
    url TEXT NOT NULL,
    channel_or_author TEXT,
    duration TEXT,
    language TEXT DEFAULT 'English',
    description TEXT,
    is_verified BOOLEAN DEFAULT true,
    verified_by TEXT DEFAULT 'University Academic Council',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_resources_course ON public.study_resources(course_code);
CREATE INDEX IF NOT EXISTS idx_study_resources_topic ON public.study_resources(topic_id);

-- 5. STUDENT TASKS TABLE (Faculty-to-Student Assignment System)
CREATE TABLE IF NOT EXISTS public.student_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES public.faculty(faculty_id) ON DELETE CASCADE,
    course_code TEXT NOT NULL REFERENCES public.courses(course_code) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL DEFAULT 'Assignment' CHECK (
        task_type IN (
            'Assignment',
            'Practice Exercise',
            'Revision Task',
            'Project',
            'Reading Task',
            'Remedial Learning Task',
            'Quiz Preparation'
        )
    ),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    instructions TEXT,
    assigned_scope TEXT NOT NULL DEFAULT 'Course' CHECK (assigned_scope IN ('Course', 'Individual Student')),
    assigned_student_id UUID REFERENCES public.students(student_id) ON DELETE CASCADE,
    due_date DATE,
    max_marks NUMERIC DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_tasks_faculty ON public.student_tasks(faculty_id);
CREATE INDEX IF NOT EXISTS idx_student_tasks_course ON public.student_tasks(course_code);
CREATE INDEX IF NOT EXISTS idx_student_tasks_student ON public.student_tasks(assigned_student_id);

-- 6. TASK SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.task_submissions (
    submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.student_tasks(task_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Assigned' CHECK (
        status IN ('Assigned', 'In Progress', 'Submitted', 'Reviewed', 'Overdue')
    ),
    submission_content TEXT,
    file_url TEXT,
    submitted_at TIMESTAMPTZ,
    marks_obtained NUMERIC,
    feedback TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.faculty(faculty_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_task_student UNIQUE (task_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_task_submissions_task ON public.task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_student ON public.task_submissions(student_id);

-- 7. FACULTY PAYROLL & SALARY TABLE
CREATE TABLE IF NOT EXISTS public.faculty_payroll (
    payroll_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES public.faculty(faculty_id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    pay_period TEXT NOT NULL,
    basic_salary NUMERIC NOT NULL,
    allowances NUMERIC NOT NULL DEFAULT 0,
    deductions NUMERIC NOT NULL DEFAULT 0,
    net_salary NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK (payment_status IN ('Paid', 'Processing', 'Pending')),
    payment_method TEXT DEFAULT 'Direct Bank Deposit',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faculty_payroll_faculty ON public.faculty_payroll(faculty_id);

-- 8. FACULTY ANNOUNCEMENTS TABLE (Optional Feature A)
CREATE TABLE IF NOT EXISTS public.faculty_announcements (
    announcement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES public.faculty(faculty_id) ON DELETE CASCADE,
    course_code TEXT NOT NULL REFERENCES public.courses(course_code) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Urgent', 'Important', 'Normal')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_course ON public.faculty_announcements(course_code);

-- 9. ENABLE ROW LEVEL SECURITY ON NEW TABLES
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_announcements ENABLE ROW LEVEL SECURITY;

-- 10. RLS POLICIES FOR NEW TABLES

-- Service role full access
CREATE POLICY "service_role_all_syllabus_topics" ON public.syllabus_topics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_study_resources" ON public.study_resources FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_student_tasks" ON public.student_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_task_submissions" ON public.task_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_faculty_payroll" ON public.faculty_payroll FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_faculty_announcements" ON public.faculty_announcements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Syllabus topics and study resources: All authenticated can view
CREATE POLICY "authenticated_select_syllabus_topics" ON public.syllabus_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_select_study_resources" ON public.study_resources FOR SELECT TO authenticated USING (true);

-- Faculty can insert / update syllabus topics and resources for their courses
CREATE POLICY "faculty_modify_syllabus_topics" ON public.syllabus_topics 
    FOR ALL TO authenticated 
    USING (public.get_current_faculty_id() IS NOT NULL)
    WITH CHECK (public.get_current_faculty_id() IS NOT NULL);

CREATE POLICY "faculty_modify_study_resources" ON public.study_resources 
    FOR ALL TO authenticated 
    USING (public.get_current_faculty_id() IS NOT NULL)
    WITH CHECK (public.get_current_faculty_id() IS NOT NULL);

-- Faculty Payroll: STRICT - Faculty can ONLY view their OWN payroll records
CREATE POLICY "faculty_view_own_payroll" ON public.faculty_payroll
    FOR SELECT TO authenticated
    USING (faculty_id = public.get_current_faculty_id());

-- Student Tasks: Faculty can manage tasks they authored
CREATE POLICY "faculty_manage_own_tasks" ON public.student_tasks
    FOR ALL TO authenticated
    USING (faculty_id = public.get_current_faculty_id())
    WITH CHECK (faculty_id = public.get_current_faculty_id());

-- Student Tasks: Students can view tasks assigned to their courses or to them directly
CREATE POLICY "student_view_assigned_tasks" ON public.student_tasks
    FOR SELECT TO authenticated
    USING (
        assigned_student_id = public.get_current_student_id()
        OR (
            assigned_scope = 'Course'
            AND course_code IN (
                SELECT course_code FROM public.enrollments 
                WHERE student_id = public.get_current_student_id()
            )
        )
    );

-- Task Submissions: Students can view and update their own submissions
CREATE POLICY "student_view_own_submissions" ON public.task_submissions
    FOR SELECT TO authenticated
    USING (student_id = public.get_current_student_id());

CREATE POLICY "student_submit_own_work" ON public.task_submissions
    FOR INSERT TO authenticated
    WITH CHECK (student_id = public.get_current_student_id());

CREATE POLICY "student_update_own_submission" ON public.task_submissions
    FOR UPDATE TO authenticated
    USING (student_id = public.get_current_student_id())
    WITH CHECK (student_id = public.get_current_student_id());

-- Task Submissions: Faculty can view and review submissions for their tasks
CREATE POLICY "faculty_review_submissions" ON public.task_submissions
    FOR ALL TO authenticated
    USING (
        task_id IN (
            SELECT task_id FROM public.student_tasks 
            WHERE faculty_id = public.get_current_faculty_id()
        )
    )
    WITH CHECK (
        task_id IN (
            SELECT task_id FROM public.student_tasks 
            WHERE faculty_id = public.get_current_faculty_id()
        )
    );

-- Faculty Announcements: Authenticated view for courses; Faculty modify own
CREATE POLICY "authenticated_view_announcements" ON public.faculty_announcements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "faculty_manage_own_announcements" ON public.faculty_announcements
    FOR ALL TO authenticated
    USING (faculty_id = public.get_current_faculty_id())
    WITH CHECK (faculty_id = public.get_current_faculty_id());

-- Faculty Profile policy
CREATE POLICY "faculty_select_own_profile" ON public.faculty
    FOR SELECT TO authenticated
    USING (
        faculty_id = public.get_current_faculty_id()
        OR auth_user_id = auth.uid()
    );

-- Examinations policy extension: Faculty can view examination marks for their assigned courses
CREATE POLICY "faculty_select_assigned_course_examinations" ON public.examinations
    FOR SELECT TO authenticated
    USING (
        course_code IN (
            SELECT course_code FROM public.timetable WHERE faculty_id = public.get_current_faculty_id()
            UNION
            SELECT course_code FROM public.faculty_workload WHERE faculty_id = public.get_current_faculty_id()
        )
    );
