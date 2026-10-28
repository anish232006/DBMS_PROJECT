export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          student_id: string
          register_number: string
          roll_number?: string
          full_name: string
          date_of_birth: string
          gender: string
          email: string
          phone: string | null
          address: string | null
          department: string
          batch_year: number
          current_semester: number
          admission_date: string
          status: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'student_id' | 'created_at'> & { student_id?: string, created_at?: string }
        Update: Partial<Database['public']['Tables']['students']['Insert']>
      }
      departments: {
        Row: {
          department_id: string
          department_name: string
          hod_faculty_id: string | null
          established_year: number | null
          building: string | null
        }
        Insert: Omit<Database['public']['Tables']['departments']['Row'], 'department_id'> & { department_id?: string }
        Update: Partial<Database['public']['Tables']['departments']['Insert']>
      }
      admissions: {
        Row: {
          application_id: string
          applicant_name: string
          date_of_birth: string
          gender: string
          email: string
          phone: string | null
          address: string | null
          department_applied: string
          previous_school: string | null
          previous_percentage: number | null
          application_date: string
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['admissions']['Row'], 'application_id' | 'created_at'> & { application_id?: string, created_at?: string }
        Update: Partial<Database['public']['Tables']['admissions']['Insert']>
      }
      courses: {
        Row: {
          course_code: string
          course_name: string
          department: string
          credits: number
          semester: number
        }
        Insert: Database['public']['Tables']['courses']['Row']
        Update: Partial<Database['public']['Tables']['courses']['Insert']>
      }
      faculty: {
        Row: {
          faculty_id: string
          full_name: string
          email: string
          phone: string | null
          department: string
          department_id: string
          designation: string
          joining_date: string
          status: string
          auth_user_id?: string | null
        }
        Insert: Omit<Database['public']['Tables']['faculty']['Row'], 'faculty_id'> & { faculty_id?: string }
        Update: Partial<Database['public']['Tables']['faculty']['Insert']>
      }
      classrooms: {
        Row: {
          classroom_id: string
          room_number: string
          building: string
          capacity: number
          room_type: string
        }
        Insert: Omit<Database['public']['Tables']['classrooms']['Row'], 'classroom_id'> & { classroom_id?: string }
        Update: Partial<Database['public']['Tables']['classrooms']['Insert']>
      }
      enrollments: {
        Row: {
          enrollment_id: string
          student_id: string
          course_code: string
          academic_term: string
          enrolled_on: string
          status: string
          department_id: string
        }
        Insert: Omit<Database['public']['Tables']['enrollments']['Row'], 'enrollment_id'> & { enrollment_id?: string }
        Update: Partial<Database['public']['Tables']['enrollments']['Insert']>
      }
      attendance: {
        Row: {
          attendance_id: string
          student_id: string
          course_code: string
          course_name: string
          attendance_date: string
          session: string
          status: 'Present' | 'Absent'
          marked_by: string | null
          created_at: string
          department_id: string
        }
        Insert: Omit<Database['public']['Tables']['attendance']['Row'], 'attendance_id' | 'created_at'> & { attendance_id?: string, created_at?: string }
        Update: Partial<Database['public']['Tables']['attendance']['Insert']>
      }
      examinations: {
        Row: {
          exam_id: string
          course_code: string
          student_id: string
          exam_type: string
          exam_date: string
          marks_obtained: number | null
          max_marks: number
          grade: string | null
          result: string | null
          department_id: string
        }
        Insert: Omit<Database['public']['Tables']['examinations']['Row'], 'exam_id'> & { exam_id?: string }
        Update: Partial<Database['public']['Tables']['examinations']['Insert']>
      }
      timetable: {
        Row: {
          timetable_id: string
          course_code: string
          faculty_id: string
          classroom_id: string
          day_of_week: string
          start_time: string
          end_time: string
          semester_section: string
          department_id: string
        }
        Insert: Omit<Database['public']['Tables']['timetable']['Row'], 'timetable_id'> & { timetable_id?: string }
        Update: Partial<Database['public']['Tables']['timetable']['Insert']>
      }
      faculty_workload: {
        Row: {
          workload_id: string
          faculty_id: string
          course_code: string
          hours_per_week: number
          academic_term: string
          department_id: string
        }
        Insert: Omit<Database['public']['Tables']['faculty_workload']['Row'], 'workload_id'> & { workload_id?: string }
        Update: Partial<Database['public']['Tables']['faculty_workload']['Insert']>
      }
      syllabus_topics: {
        Row: {
          topic_id: string
          course_code: string
          topic_title: string
          topic_description: string | null
          unit_number: number
          learning_objectives: string | null
          difficulty_level: 'Beginner' | 'Medium' | 'Advanced'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['syllabus_topics']['Row'], 'topic_id' | 'created_at'> & { topic_id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['syllabus_topics']['Insert']>
      }
      study_resources: {
        Row: {
          resource_id: string
          course_code: string
          topic_id: string | null
          title: string
          resource_type: 'Video Lessons' | 'Study Materials' | 'Practice Questions' | 'Textbook' | 'Lecture Notes'
          url: string
          channel_or_author: string | null
          duration: string | null
          language: string | null
          description: string | null
          is_verified: boolean
          verified_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['study_resources']['Row'], 'resource_id' | 'created_at'> & { resource_id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['study_resources']['Insert']>
      }
      student_tasks: {
        Row: {
          task_id: string
          faculty_id: string
          course_code: string
          title: string
          description: string | null
          task_type: 'Assignment' | 'Practice Exercise' | 'Revision Task' | 'Project' | 'Reading Task' | 'Remedial Learning Task' | 'Quiz Preparation'
          priority: 'High' | 'Medium' | 'Low'
          instructions: string | null
          assigned_scope: 'Course' | 'Individual Student'
          assigned_student_id: string | null
          due_date: string | null
          max_marks: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['student_tasks']['Row'], 'task_id' | 'created_at'> & { task_id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['student_tasks']['Insert']>
      }
      task_submissions: {
        Row: {
          submission_id: string
          task_id: string
          student_id: string
          status: 'Assigned' | 'In Progress' | 'Submitted' | 'Reviewed' | 'Overdue'
          submission_content: string | null
          file_url: string | null
          submitted_at: string | null
          marks_obtained: number | null
          feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['task_submissions']['Row'], 'submission_id' | 'created_at'> & { submission_id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['task_submissions']['Insert']>
      }
      faculty_payroll: {
        Row: {
          payroll_id: string
          faculty_id: string
          employee_id: string
          pay_period: string
          basic_salary: number
          allowances: number
          deductions: number
          net_salary: number
          payment_date: string
          payment_status: 'Paid' | 'Processing' | 'Pending'
          payment_method: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['faculty_payroll']['Row'], 'payroll_id' | 'created_at'> & { payroll_id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['faculty_payroll']['Insert']>
      }
      faculty_announcements: {
        Row: {
          announcement_id: string
          faculty_id: string
          course_code: string
          title: string
          content: string
          priority: 'Urgent' | 'Important' | 'Normal'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['faculty_announcements']['Row'], 'announcement_id' | 'created_at'> & { announcement_id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['faculty_announcements']['Insert']>
      }
    }
  }
}
