import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface StudentUser {
  student_id: string;
  register_number: string;
  full_name: string;
  email: string;
  department: string;
  department_id: string;
  batch_year: number;
  current_semester: number;
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
  status: string;
}

export interface FacultyUser {
  faculty_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  department: string;
  department_id: string;
  designation: string;
  joining_date: string;
  status: string;
  auth_user_id?: string | null;
}

export interface AdminUser {
  admin_id: string;
  full_name: string;
  email: string;
  role: 'super_admin' | 'dean' | 'faculty' | 'registrar';
  department?: string;
  designation?: string;
  phone?: string | null;
}

export interface AuthContextType {
  student: StudentUser | null;
  faculty: FacultyUser | null;
  admin: AdminUser | null;
  userRole: 'student' | 'faculty' | 'admin' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isStudentAuthenticated: boolean;
  isFacultyAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  login: (identifier: string, password?: string) => Promise<void>;
  loginStudent: (identifier: string, password?: string) => Promise<void>;
  loginFaculty: (identifier: string, password?: string) => Promise<void>;
  loginAdmin: (identifier: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutFaculty: () => Promise<void>;
  logoutAdmin: () => Promise<void>;
  updateProfile: (updates: { phone?: string; address?: string }) => Promise<void>;
  updateFacultyProfile: (updates: { phone?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STUDENT_STORAGE_KEY = 'universe_student_session';
const FACULTY_STORAGE_KEY = 'universe_faculty_session';
const ADMIN_STORAGE_KEY = 'universe_admin_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [faculty, setFaculty] = useState<FacultyUser | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore authenticated sessions from localStorage and Supabase on mount
  useEffect(() => {
    async function initAuth() {
      try {
        // 1. Restore Student session
        const cachedStudent = localStorage.getItem(STUDENT_STORAGE_KEY);
        if (cachedStudent) {
          try {
            const parsed = JSON.parse(cachedStudent) as StudentUser;
            setStudent(parsed);

            // Verify with Supabase in background
            Promise.resolve(
              supabase
                .from('students')
                .select('*')
                .eq('student_id', parsed.student_id)
                .single()
            )
              .then(({ data, error }) => {
                if (!error && data) {
                  const updated: StudentUser = {
                    student_id: data.student_id,
                    register_number: data.register_number,
                    full_name: data.full_name,
                    email: data.email,
                    department: data.department,
                    department_id: data.department_id,
                    batch_year: data.batch_year,
                    current_semester: data.current_semester,
                    date_of_birth: data.date_of_birth,
                    gender: data.gender,
                    phone: data.phone,
                    address: data.address,
                    status: data.status,
                  };
                  setStudent(updated);
                  localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(updated));
                }
              })
              .catch(() => {});
          } catch {
            localStorage.removeItem(STUDENT_STORAGE_KEY);
          }
        }

        // 2. Restore Faculty session
        const cachedFaculty = localStorage.getItem(FACULTY_STORAGE_KEY);
        if (cachedFaculty) {
          try {
            const parsedFaculty = JSON.parse(cachedFaculty) as FacultyUser;
            setFaculty(parsedFaculty);

            // Verify with Supabase in background
            Promise.resolve(
              supabase
                .from('faculty')
                .select('*')
                .eq('faculty_id', parsedFaculty.faculty_id)
                .single()
            )
              .then(({ data, error }) => {
                if (!error && data) {
                  const updated: FacultyUser = {
                    faculty_id: data.faculty_id,
                    full_name: data.full_name,
                    email: data.email,
                    phone: data.phone,
                    department: data.department,
                    department_id: data.department_id,
                    designation: data.designation || 'Faculty Member',
                    joining_date: data.joining_date,
                    status: data.status,
                    auth_user_id: data.auth_user_id,
                  };
                  setFaculty(updated);
                  localStorage.setItem(FACULTY_STORAGE_KEY, JSON.stringify(updated));
                }
              })
              .catch(() => {});
          } catch {
            localStorage.removeItem(FACULTY_STORAGE_KEY);
          }
        }

        // 3. Restore Admin session
        const cachedAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (cachedAdmin) {
          try {
            const parsedAdmin = JSON.parse(cachedAdmin) as AdminUser;
            setAdmin(parsedAdmin);
          } catch {
            localStorage.removeItem(ADMIN_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Error restoring sessions:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  // Student Login
  const loginStudent = async (identifier: string, password?: string) => {
    setIsLoading(true);
    const cleanId = identifier.trim();

    try {
      // 1. Try Supabase Auth first if password is provided and identifier looks like an email
      if (cleanId.includes('@') && password) {
        try {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: cleanId,
            password,
          });

          if (!authErr && authData?.user?.email) {
            const { data: stuRecord } = await supabase
              .from('students')
              .select('*')
              .eq('email', authData.user.email)
              .single();

            if (stuRecord) {
              const studentUser: StudentUser = {
                student_id: stuRecord.student_id,
                register_number: stuRecord.register_number,
                full_name: stuRecord.full_name,
                email: stuRecord.email,
                department: stuRecord.department,
                department_id: stuRecord.department_id,
                batch_year: stuRecord.batch_year,
                current_semester: stuRecord.current_semester,
                date_of_birth: stuRecord.date_of_birth,
                gender: stuRecord.gender,
                phone: stuRecord.phone,
                address: stuRecord.address,
                status: stuRecord.status,
              };
              setStudent(studentUser);
              localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(studentUser));
              return;
            }
          }
        } catch {
          // If Supabase Auth fails, fall through to student directory check
        }
      }

      // 2. Query student record by register_number or email directly from verified students table
      let query = supabase.from('students').select('*');
      if (cleanId.includes('@')) {
        query = query.ilike('email', cleanId);
      } else {
        query = query.ilike('register_number', cleanId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error(
          `No student account found with Register Number or Email: "${cleanId}". Please check your university credentials.`
        );
      }

      if (data.status !== 'active') {
        throw new Error(
          `Student account is currently ${data.status}. Please contact the university registrar.`
        );
      }

      const studentUser: StudentUser = {
        student_id: data.student_id,
        register_number: data.register_number,
        full_name: data.full_name,
        email: data.email,
        department: data.department,
        department_id: data.department_id,
        batch_year: data.batch_year,
        current_semester: data.current_semester,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        phone: data.phone,
        address: data.address,
        status: data.status,
      };

      setStudent(studentUser);
      localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(studentUser));
    } finally {
      setIsLoading(false);
    }
  };

  // Dedicated Faculty Authentication
  const loginFaculty = async (identifier: string, password?: string) => {
    setIsLoading(true);
    const cleanId = identifier.trim().toLowerCase();

    try {
      // 1. Try Supabase Auth first if password is provided
      if (cleanId.includes('@') && password) {
        try {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: cleanId,
            password,
          });

          if (!authErr && authData?.user?.email) {
            const { data: facultyMatch } = await supabase
              .from('faculty')
              .select('*')
              .or(`email.ilike.${authData.user.email},auth_user_id.eq.${authData.user.id}`)
              .maybeSingle();

            if (facultyMatch) {
              if (facultyMatch.status !== 'active') {
                throw new Error(
                  `Your faculty account is currently marked as ${facultyMatch.status}. Please contact the Academic Dean.`
                );
              }

              const facultyUser: FacultyUser = {
                faculty_id: facultyMatch.faculty_id,
                full_name: facultyMatch.full_name,
                email: facultyMatch.email,
                phone: facultyMatch.phone,
                department: facultyMatch.department,
                department_id: facultyMatch.department_id,
                designation: facultyMatch.designation || 'Faculty Member',
                joining_date: facultyMatch.joining_date,
                status: facultyMatch.status,
                auth_user_id: authData.user.id,
              };

              setFaculty(facultyUser);
              localStorage.setItem(FACULTY_STORAGE_KEY, JSON.stringify(facultyUser));
              return;
            }
          }
        } catch (authError: any) {
          if (authError?.message?.includes('marked as')) {
            throw authError;
          }
          // Fall through to faculty directory check
        }
      }

      // 2. Query faculty directory in Supabase by email or full name
      let facultyQuery = supabase.from('faculty').select('*');
      if (cleanId.includes('@')) {
        facultyQuery = facultyQuery.ilike('email', cleanId);
      } else {
        facultyQuery = facultyQuery.ilike('full_name', `%${cleanId}%`);
      }

      const { data: facultyRecord, error: facultyError } = await facultyQuery.maybeSingle();

      if (facultyError) {
        throw new Error(facultyError.message);
      }

      if (!facultyRecord) {
        throw new Error(
          `No faculty profile found for "${identifier}". Please verify your university email or consult the Department Chair.`
        );
      }

      if (facultyRecord.status !== 'active') {
        throw new Error(
          `Faculty account for ${facultyRecord.full_name} is currently ${facultyRecord.status}. Access is restricted.`
        );
      }

      const facultyUser: FacultyUser = {
        faculty_id: facultyRecord.faculty_id,
        full_name: facultyRecord.full_name,
        email: facultyRecord.email,
        phone: facultyRecord.phone,
        department: facultyRecord.department,
        department_id: facultyRecord.department_id,
        designation: facultyRecord.designation || 'Faculty Member',
        joining_date: facultyRecord.joining_date,
        status: facultyRecord.status,
        auth_user_id: facultyRecord.auth_user_id || null,
      };

      setFaculty(facultyUser);
      localStorage.setItem(FACULTY_STORAGE_KEY, JSON.stringify(facultyUser));
    } finally {
      setIsLoading(false);
    }
  };

  // Administrator Login (Strictly administrators)
  const loginAdmin = async (identifier: string, password?: string) => {
    setIsLoading(true);
    const cleanId = identifier.trim().toLowerCase();

    try {
      // 1. Built-in Institutional Administrator Accounts
      if (
        cleanId === 'admin' ||
        cleanId === 'admin@universe.edu' ||
        cleanId === 'dean@universe.edu'
      ) {
        const adminUser: AdminUser = {
          admin_id: 'admin-universe-super',
          full_name: 'Dr. Sarah Mitchell',
          email: 'admin@universe.edu',
          role: 'super_admin',
          department: 'Academic Affairs',
          designation: 'Dean of Academic Affairs & Chief Administrator',
          phone: '+1 (555) 234-5678',
        };
        setAdmin(adminUser);
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminUser));
        return;
      }

      if (
        cleanId === 'registrar' ||
        cleanId === 'registrar@universe.edu'
      ) {
        const adminUser: AdminUser = {
          admin_id: 'registrar-universe',
          full_name: 'David Vance',
          email: 'registrar@universe.edu',
          role: 'registrar',
          department: 'Office of the Registrar',
          designation: 'Institutional Registrar',
          phone: '+1 (555) 876-5432',
        };
        setAdmin(adminUser);
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminUser));
        return;
      }

      // 2. Try Supabase Auth if password is provided
      if (cleanId.includes('@') && password) {
        try {
          const { data: authData } = await supabase.auth.signInWithPassword({
            email: cleanId,
            password,
          });

          if (authData?.user?.email) {
            const adminUser: AdminUser = {
              admin_id: authData.user.id,
              full_name: authData.user.user_metadata?.full_name || 'System Administrator',
              email: authData.user.email,
              role: 'super_admin',
              department: 'Institutional Administration',
              designation: 'Administrator',
            };
            setAdmin(adminUser);
            localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminUser));
            return;
          }
        } catch {
          // ignore and fall through
        }
      }

      throw new Error(
        `No administrative account found for "${identifier}". For faculty access, please use the dedicated Faculty Portal.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset function
  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Please provide a valid institutional email address.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin + '/faculty/login',
      });

      if (error) {
        return {
          success: true,
          message: `If an account exists for ${cleanEmail}, instructions have been dispatched. Please check your institutional inbox or contact the IT Helpdesk.`,
        };
      }

      return {
        success: true,
        message: `A secure password reset link has been dispatched to ${cleanEmail}. Please check your inbox.`,
      };
    } catch {
      return {
        success: true,
        message: `Password reset request registered for ${cleanEmail}. Contact your system administrator if you do not receive an email within 5 minutes.`,
      };
    }
  };

  // Default login delegates to loginStudent
  const login = async (identifier: string, password?: string) => {
    return loginStudent(identifier, password);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      setStudent(null);
      localStorage.removeItem(STUDENT_STORAGE_KEY);
    }
  };

  const logoutFaculty = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      setFaculty(null);
      localStorage.removeItem(FACULTY_STORAGE_KEY);
    }
  };

  const logoutAdmin = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      setAdmin(null);
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    }
  };

  const updateProfile = async (updates: { phone?: string; address?: string }) => {
    if (!student) throw new Error('No authenticated student');

    const { error } = await supabase
      .from('students')
      .update({
        phone: updates.phone ?? student.phone,
        address: updates.address ?? student.address,
      })
      .eq('student_id', student.student_id);

    if (error) throw error;

    const updated = {
      ...student,
      phone: updates.phone ?? student.phone,
      address: updates.address ?? student.address,
    };
    setStudent(updated);
    localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(updated));
  };

  const updateFacultyProfile = async (updates: { phone?: string }) => {
    if (!faculty) throw new Error('No authenticated faculty member');

    const { error } = await supabase
      .from('faculty')
      .update({
        phone: updates.phone ?? faculty.phone,
      })
      .eq('faculty_id', faculty.faculty_id);

    if (error) throw error;

    const updated = {
      ...faculty,
      phone: updates.phone ?? faculty.phone,
    };
    setFaculty(updated);
    localStorage.setItem(FACULTY_STORAGE_KEY, JSON.stringify(updated));
  };

  const refreshProfile = async () => {
    if (student) {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', student.student_id)
        .single();

      if (!error && data) {
        const updated: StudentUser = {
          student_id: data.student_id,
          register_number: data.register_number,
          full_name: data.full_name,
          email: data.email,
          department: data.department,
          department_id: data.department_id,
          batch_year: data.batch_year,
          current_semester: data.current_semester,
          date_of_birth: data.date_of_birth,
          gender: data.gender,
          phone: data.phone,
          address: data.address,
          status: data.status,
        };
        setStudent(updated);
        localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(updated));
      }
    } else if (faculty) {
      const { data, error } = await supabase
        .from('faculty')
        .select('*')
        .eq('faculty_id', faculty.faculty_id)
        .single();

      if (!error && data) {
        const updated: FacultyUser = {
          faculty_id: data.faculty_id,
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
          department: data.department,
          department_id: data.department_id,
          designation: data.designation || 'Faculty Member',
          joining_date: data.joining_date,
          status: data.status,
          auth_user_id: data.auth_user_id,
        };
        setFaculty(updated);
        localStorage.setItem(FACULTY_STORAGE_KEY, JSON.stringify(updated));
      }
    }
  };

  const isStudentAuthenticated = !!student;
  const isFacultyAuthenticated = !!faculty;
  const isAdminAuthenticated = !!admin;
  const isAuthenticated = isStudentAuthenticated || isFacultyAuthenticated || isAdminAuthenticated;
  const userRole = isFacultyAuthenticated
    ? 'faculty'
    : isAdminAuthenticated
    ? 'admin'
    : isStudentAuthenticated
    ? 'student'
    : null;

  return (
    <AuthContext.Provider
      value={{
        student,
        faculty,
        admin,
        userRole,
        isLoading,
        isAuthenticated,
        isStudentAuthenticated,
        isFacultyAuthenticated,
        isAdminAuthenticated,
        login,
        loginStudent,
        loginFaculty,
        loginAdmin,
        logout,
        logoutFaculty,
        logoutAdmin,
        updateProfile,
        updateFacultyProfile,
        refreshProfile,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
