import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminProtectedRoute } from './components/auth/AdminProtectedRoute';
import { FacultyProtectedRoute } from './components/auth/FacultyProtectedRoute';
import { StudentLayout } from './components/layout/StudentLayout';
import { AppLayout } from './components/layout/AppLayout';
import { FacultyLayout } from './components/layout/FacultyLayout';
import { ToastContainer } from './components/ui/Toast';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import FacultyLoginPage from './pages/auth/FacultyLoginPage';

// Student Portal Pages (Exclusively for students to view their own records)
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfilePage from './pages/student/StudentProfilePage';
import AcademicPerformancePage from './pages/student/AcademicPerformancePage';
import StudentAttendancePage from './pages/student/StudentAttendancePage';
import ExaminationResultsPage from './pages/student/ExaminationResultsPage';
import StudentTimetablePage from './pages/student/StudentTimetablePage';
import StudentTasksPage from './pages/student/StudentTasksPage';
import StudyAssistantPage from './pages/student/StudyAssistantPage';
import StudyResourcesPage from './pages/student/StudyResourcesPage';
import StudentSettingsPage from './pages/student/StudentSettingsPage';

// Faculty Portal Pages (Dedicated faculty academic management & grading)
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyProfilePage from './pages/faculty/FacultyProfilePage';
import FacultyCoursesPage from './pages/faculty/FacultyCoursesPage';
import FacultyStudentPerformancePage from './pages/faculty/FacultyStudentPerformancePage';
import FacultyTasksPage from './pages/faculty/FacultyTasksPage';
import FacultySalaryPage from './pages/faculty/FacultySalaryPage';
import FacultyResourcesPage from './pages/faculty/FacultyResourcesPage';
import FacultyAttendancePage from './pages/faculty/FacultyAttendancePage';

// Academic Management Pages (Exclusively for Administrators & Faculty)
import Dashboard from './pages/Dashboard';
import StudentsPage from './pages/academic/Students';
import StudentProfile from './pages/academic/StudentProfile';
import AdmissionsPage from './pages/academic/Admissions';
import DepartmentsPage from './pages/academic/Departments';
import CoursesPage from './pages/academic/Courses';
import FacultyPage from './pages/academic/Faculty';
import ClassroomsPage from './pages/academic/Classrooms';
import EnrollmentsPage from './pages/academic/Enrollments';
import AttendancePage from './pages/academic/Attendance';
import ExaminationsPage from './pages/academic/Examinations';
import TimetablePage from './pages/academic/Timetable';
import FacultyWorkloadPage from './pages/academic/FacultyWorkload';
import AiPerformanceDashboard from './pages/academic/AiPerformanceDashboard';

// Campus
import { HostelRoomsPage, HostelAllocationsPage } from './pages/campus/Hostel';
import {
  ClubsPage,
  ClubMembershipsPage,
  EventsPage,
  EventParticipantsPage,
  SportsTeamsPage,
  SportsParticipationPage,
} from './pages/campus/Campus';

// Support
import {
  LibraryBooksPage,
  LibraryTransactionsPage,
  TransportRoutesPage,
  TransportAllocationsPage,
  HealthRecordsPage,
  VisitorLogsPage,
} from './pages/support/Support';

// Career
import {
  CompaniesPage,
  PlacementDrivesPage,
  PlacementApplicationsPage,
  ResearchProjectsPage,
  ResearchParticipantsPage,
  AlumniPage,
} from './pages/career/Career';

// Admin
import {
  FeeStructurePage,
  FinancePage,
  InventoryPage,
  GrievancesPage,
  FeedbackPage,
} from './pages/admin/Admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Root Gateway Router:
 * Redirects authenticated administrators to /management
 * Redirects authenticated students to /student/dashboard
 * Shows the prestigious University Portal Gateway for unauthenticated visitors
 */
function GatewayRouter() {
  const { isStudentAuthenticated, isAdminAuthenticated, isFacultyAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAdminAuthenticated) {
    return <Navigate to="/management" replace />;
  }

  if (isFacultyAuthenticated) {
    return <Navigate to="/faculty/dashboard" replace />;
  }

  if (isStudentAuthenticated) {
    return <Navigate to="/student/dashboard" replace />;
  }

  return <LoginPage defaultRole="choose" />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ToastContainer />
          <Routes>
            {/* 1. Main Gateway & Public Authentication Routes */}
            <Route path="/" element={<GatewayRouter />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<LoginPage defaultRole="admin" />} />
            <Route path="/student/login" element={<LoginPage defaultRole="student" />} />
            <Route path="/faculty/login" element={<FacultyLoginPage />} />

            {/* 2. Isolated Student Portal (Strictly student role) */}
            <Route
              path="/student"
              element={
                <ProtectedRoute>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="profile" element={<StudentProfilePage />} />
              <Route path="academic-performance" element={<AcademicPerformancePage />} />
              <Route path="attendance" element={<StudentAttendancePage />} />
              <Route path="examination-results" element={<ExaminationResultsPage />} />
              <Route path="timetable" element={<StudentTimetablePage />} />
              <Route path="tasks" element={<StudentTasksPage />} />
              <Route path="study-assistant" element={<StudyAssistantPage />} />
              <Route path="study-resources" element={<StudyResourcesPage />} />
              <Route path="settings" element={<StudentSettingsPage />} />
            </Route>

            {/* Convenient redirects for student links */}
            <Route path="/my-profile" element={<Navigate to="/student/profile" replace />} />
            <Route path="/academic-performance" element={<Navigate to="/student/academic-performance" replace />} />
            <Route path="/examination-results" element={<Navigate to="/student/examination-results" replace />} />
            <Route path="/my-tasks" element={<Navigate to="/student/tasks" replace />} />
            <Route path="/study-assistant" element={<Navigate to="/student/study-assistant" replace />} />
            <Route path="/study-resources" element={<Navigate to="/student/study-resources" replace />} />

            {/* 3. Dedicated Faculty Portal (Strictly Faculty role) */}
            <Route
              path="/faculty"
              element={
                <FacultyProtectedRoute>
                  <FacultyLayout />
                </FacultyProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/faculty/dashboard" replace />} />
              <Route path="dashboard" element={<FacultyDashboard />} />
              <Route path="profile" element={<FacultyProfilePage />} />
              <Route path="courses" element={<FacultyCoursesPage />} />
              <Route path="attendance" element={<FacultyAttendancePage />} />
              <Route path="performance" element={<FacultyStudentPerformancePage />} />
              <Route path="tasks" element={<FacultyTasksPage />} />
              <Route path="salary" element={<FacultySalaryPage />} />
              <Route path="resources" element={<FacultyResourcesPage />} />
            </Route>

            {/* 4. Isolated Admin & Management Portal (Strictly Admin / Faculty role) */}
            <Route path="/admin" element={<Navigate to="/management" replace />} />
            <Route
              path="/management"
              element={
                <AdminProtectedRoute>
                  <AppLayout />
                </AdminProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              {/* AI Performance Dashboard - Exclusively visible to Administrators */}
              <Route path="ai-analytics" element={<AiPerformanceDashboard />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/:id" element={<StudentProfile />} />
              <Route path="admissions" element={<AdmissionsPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="courses" element={<CoursesPage />} />
              <Route path="faculty" element={<FacultyPage />} />
              <Route path="classrooms" element={<ClassroomsPage />} />
              <Route path="enrollments" element={<EnrollmentsPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="examinations" element={<ExaminationsPage />} />
              <Route path="timetable" element={<TimetablePage />} />
              <Route path="faculty-workload" element={<FacultyWorkloadPage />} />

              {/* Campus */}
              <Route path="hostel-rooms" element={<HostelRoomsPage />} />
              <Route path="hostel-allocations" element={<HostelAllocationsPage />} />
              <Route path="clubs" element={<ClubsPage />} />
              <Route path="club-memberships" element={<ClubMembershipsPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="event-participants" element={<EventParticipantsPage />} />
              <Route path="sports-teams" element={<SportsTeamsPage />} />
              <Route path="sports-participation" element={<SportsParticipationPage />} />

              {/* Support */}
              <Route path="library-books" element={<LibraryBooksPage />} />
              <Route path="library-transactions" element={<LibraryTransactionsPage />} />
              <Route path="transport-routes" element={<TransportRoutesPage />} />
              <Route path="transport-allocations" element={<TransportAllocationsPage />} />
              <Route path="health-records" element={<HealthRecordsPage />} />
              <Route path="visitor-logs" element={<VisitorLogsPage />} />

              {/* Career */}
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="placement-drives" element={<PlacementDrivesPage />} />
              <Route path="placement-applications" element={<PlacementApplicationsPage />} />
              <Route path="research-projects" element={<ResearchProjectsPage />} />
              <Route path="research-participants" element={<ResearchParticipantsPage />} />
              <Route path="alumni" element={<AlumniPage />} />

              {/* Admin */}
              <Route path="fee-structure" element={<FeeStructurePage />} />
              <Route path="finance" element={<FinancePage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="grievances" element={<GrievancesPage />} />
              <Route path="feedback" element={<FeedbackPage />} />
            </Route>

            {/* Fallback to Gateway */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
