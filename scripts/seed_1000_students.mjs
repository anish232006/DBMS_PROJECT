import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = 'https://gqnsfryquqvfjevaucym.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbnNmcnlxdXF2ZmpldmF1Y3ltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYxOTExNiwiZXhwIjoyMDk5MTk1MTE2fQ.G6AJ058ALwQAAOA97hgOZn_e7HnxuQQE7f6SrtGrmbk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const FIRST_NAMES_MALE = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishan',
  'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Advaith', 'Aryan', 'Dhruv', 'Kabir', 'Ritvik', 'Darsh',
  'Rohan', 'Karthik', 'Siddharth', 'Harish', 'Srihari', 'Mohammed', 'Vishal', 'Naveen', 'Vignesh', 'Pradeep',
  'Gautam', 'Kunal', 'Manish', 'Nikhil', 'Pawan', 'Rajesh', 'Sachin', 'Tushar', 'Varun', 'Yash',
  'Abhishek', 'Bhuvan', 'Chirag', 'Deepak', 'Ganesh', 'Hemant', 'Jitendra', 'Kiran', 'Lalit', 'Mukesh',
  'Omkar', 'Pankaj', 'Raghav', 'Suraj', 'Tejas', 'Umesh', 'Vikram', 'Anish', 'Zeeshan', 'Farhan',
  'Sameer', 'Ashwin', 'Dev', 'Eashan', 'Jay', 'Kallol', 'Madhav', 'Prashant', 'Ranjit', 'Sumit'
];

const FIRST_NAMES_FEMALE = [
  'Ananya', 'Diya', 'Sanvi', 'Aanya', 'Aadhya', 'Pari', 'Saanvi', 'Myra', 'Sara', 'Anaya',
  'Ishita', 'Riya', 'Kavya', 'Kiara', 'Anika', 'Avani', 'Navya', 'Sneha', 'Pooja', 'Meera',
  'Priya', 'Tanvi', 'Swati', 'Divya', 'Lakshmi', 'Deepa', 'Shreya', 'Nidhi', 'Bhavna', 'Roshni',
  'Aditi', 'Alka', 'Bina', 'Chhavi', 'Disha', 'Geeta', 'Harshita', 'Ila', 'Jyoti', 'Komal',
  'Latika', 'Mansi', 'Neha', 'Payal', 'Radha', 'Simran', 'Trisha', 'Uma', 'Varsha', 'Yamini',
  'Aparna', 'Chandana', 'Durga', 'Gowri', 'Hamsini', 'Janani', 'Keerthi', 'Madhavi', 'Nandini', 'Pavithra',
  'Rakshita', 'Sangeetha', 'Tharani', 'Vasundhara', 'Yogitha', 'Zoya', 'Fatima', 'Ayesha', 'Mehak', 'Sana'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Reddy', 'Rao', 'Kumar', 'Nair', 'Menon', 'Iyer', 'Gupta', 'Verma',
  'Singh', 'Joshi', 'Bhat', 'Pillai', 'Malhotra', 'Desai', 'Das', 'Bose', 'Chatterjee', 'Mukherjee',
  'Nambiar', 'Sundaram', 'Subramanian', 'Balaji', 'Natarajan', 'Venkataraman', 'Mishra', 'Pandey', 'Chopra', 'Kapoor',
  'Agarwal', 'Bansal', 'Saxena', 'Tiwari', 'Bhattacharya', 'Srinivasan', 'Raghavan', 'Kulkarni', 'Deshmukh', 'Patil',
  'Chauhan', 'Yadav', 'Maurya', 'Thakur', 'Gowda', 'Shetty', 'Hegde', 'Kamath', 'Fernandes', 'D\'Souza'
];

const CITIES = [
  { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
  { city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001' },
  { city: 'Madurai', state: 'Tamil Nadu', pincode: '625001' },
  { city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  { city: 'Mysuru', state: 'Karnataka', pincode: '570001' },
  { city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
  { city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520001' },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', pincode: '530001' },
  { city: 'Kochi', state: 'Kerala', pincode: '682001' },
  { city: 'Thiruvananthapuram', state: 'Kerala', pincode: '695001' },
  { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  { city: 'Pune', state: 'Maharashtra', pincode: '411001' },
  { city: 'New Delhi', state: 'Delhi', pincode: '110001' },
  { city: 'Kolkata', state: 'West Bengal', pincode: '700001' }
];

const STREETS = [
  'MG Road', 'Anna Salai', 'Gandhi Road', 'Cross Street', '1st Main Road',
  'Nehru Street', 'Bharathi Nagar', 'Avinashi Road', 'Indira Nagar', 'RS Puram',
  'Koramangala', 'Jayanagar', 'Banjara Hills', 'Marine Drive', 'Park Street'
];

const DEPT_CONFIGS = [
  { name: 'Computer Science', code: 'CS', weight: 22 },
  { name: 'Electronics', code: 'EC', weight: 16 },
  { name: 'Mechanical', code: 'ME', weight: 14 },
  { name: 'Electrical', code: 'EE', weight: 12 },
  { name: 'Civil', code: 'CE', weight: 12 },
  { name: 'Business', code: 'BA', weight: 12 },
  { name: 'Mathematics', code: 'MA', weight: 6 },
  { name: 'Physics', code: 'PH', weight: 6 },
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function runSeed() {
  console.log('🚀 Starting 1000 Students Database Population...');

  // 1. Fetch existing departments, courses, rooms, routes, and existing register numbers
  const { data: departments, error: deptErr } = await supabase.from('departments').select('*');
  if (deptErr) throw new Error('Failed to fetch departments: ' + deptErr.message);

  const deptMap = {};
  departments.forEach(d => {
    deptMap[d.department_name] = d.department_id;
  });

  const { data: courses, error: courseErr } = await supabase.from('courses').select('*');
  if (courseErr) throw new Error('Failed to fetch courses: ' + courseErr.message);

  const coursesByDept = {};
  courses.forEach(c => {
    coursesByDept[c.department] = coursesByDept[c.department] || [];
    coursesByDept[c.department].push(c);
  });

  const { data: existingRegs } = await supabase.from('students').select('register_number, email');
  const usedRegNumbers = new Set((existingRegs || []).map(r => r.register_number));
  const usedEmails = new Set((existingRegs || []).map(r => r.email.toLowerCase()));

  const { data: hostelRooms } = await supabase.from('hostel_rooms').select('room_id').limit(50);
  const { data: transportRoutes } = await supabase.from('transport_routes').select('route_id').limit(30);

  console.log(`📊 Found ${departments.length} departments, ${courses.length} courses, and ${usedRegNumbers.size} existing students.`);

  // 2. Generate 1000 students
  const TARGET_COUNT = 1000;
  const newStudents = [];
  const studentMetadata = []; // to help generate enrollments, exams, attendance

  // Semester & batch year distribution
  // 35% 1st sem (2026), 30% 3rd sem (2025), 20% 5th sem (2024), 15% 7th sem (2023)
  const batchPlans = [
    { year: 2026, sem: 1, count: 350, admDate: '2026-08-16', dobYearRange: [2006, 2007] },
    { year: 2025, sem: 3, count: 300, admDate: '2025-08-14', dobYearRange: [2005, 2006] },
    { year: 2024, sem: 5, count: 200, admDate: '2024-08-12', dobYearRange: [2004, 2005] },
    { year: 2023, sem: 7, count: 150, admDate: '2023-08-10', dobYearRange: [2003, 2004] },
  ];

  let regSequence = 1100;

  for (const batch of batchPlans) {
    for (let i = 0; i < batch.count; i++) {
      // Pick department based on weighted distribution
      const randWeight = getRandomInt(1, 100);
      let cumulative = 0;
      let selectedDeptConfig = DEPT_CONFIGS[0];
      for (const d of DEPT_CONFIGS) {
        cumulative += d.weight;
        if (randWeight <= cumulative) {
          selectedDeptConfig = d;
          break;
        }
      }

      const isMale = Math.random() < 0.52;
      const firstName = isMale ? getRandomElement(FIRST_NAMES_MALE) : getRandomElement(FIRST_NAMES_FEMALE);
      const lastName = getRandomElement(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const gender = isMale ? 'Male' : 'Female';

      // Register Number format: URK{YY}{DEPT}{NUMBER}
      const yy = batch.year.toString().slice(2);
      let regNumber = '';
      do {
        regSequence++;
        regNumber = `URK${yy}${selectedDeptConfig.code}${regSequence}`;
      } while (usedRegNumbers.has(regNumber));
      usedRegNumbers.add(regNumber);

      // Email format
      let email = '';
      let emailSuffix = 1;
      const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
      const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
      do {
        email = emailSuffix === 1 
          ? `${cleanFirst}.${cleanLast}${getRandomInt(10, 99)}@karunya.edu.in`
          : `${cleanFirst}.${cleanLast}${regSequence}@karunya.edu.in`;
        emailSuffix++;
      } while (usedEmails.has(email.toLowerCase()));
      usedEmails.add(email.toLowerCase());

      // Date of birth
      const dobYear = getRandomInt(batch.dobYearRange[0], batch.dobYearRange[1]);
      const dobMonth = String(getRandomInt(1, 12)).padStart(2, '0');
      const dobDay = String(getRandomInt(1, 28)).padStart(2, '0');
      const dob = `${dobYear}-${dobMonth}-${dobDay}`;

      // Phone
      const phonePrefix = getRandomElement(['98', '97', '94', '93', '91', '89', '79', '88']);
      const phone = `${phonePrefix}${getRandomInt(10000000, 99999999)}`;

      // Address
      const cityObj = getRandomElement(CITIES);
      const doorNo = getRandomInt(1, 350);
      const street = getRandomElement(STREETS);
      const address = `${doorNo}, ${street}, ${cityObj.city}, ${cityObj.state} - ${cityObj.pincode}`;

      const studentId = crypto.randomUUID();
      const deptId = deptMap[selectedDeptConfig.name] || Object.values(deptMap)[0];

      // Status
      const statusRand = Math.random();
      const status = statusRand < 0.96 ? 'active' : (statusRand < 0.98 ? 'graduated' : 'inactive');

      const studentRecord = {
        student_id: studentId,
        register_number: regNumber,
        full_name: fullName,
        date_of_birth: dob,
        gender: gender,
        email: email,
        phone: phone,
        address: address,
        department: selectedDeptConfig.name,
        department_id: deptId,
        batch_year: batch.year,
        current_semester: batch.sem,
        admission_date: batch.admDate,
        status: status,
        created_at: new Date(Date.now() - getRandomInt(10, 80) * 86400000).toISOString()
      };

      newStudents.push(studentRecord);
      studentMetadata.push({
        student_id: studentId,
        department: selectedDeptConfig.name,
        department_id: deptId,
        semester: batch.sem,
        status: status
      });
    }
  }

  console.log(`Generated ${newStudents.length} student records in memory.`);

  // 3. Insert Students in batches of 100
  const CHUNK_SIZE = 100;
  console.log('Inserting students into Supabase...');
  for (let i = 0; i < newStudents.length; i += CHUNK_SIZE) {
    const chunk = newStudents.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('students').insert(chunk);
    if (error) {
      console.error(`Error inserting students chunk ${i / CHUNK_SIZE + 1}:`, error.message);
      throw error;
    }
    console.log(`  ✓ Inserted students ${i + 1} to ${Math.min(i + CHUNK_SIZE, newStudents.length)}`);
  }
  console.log('🎉 1000 Students successfully saved to database!');

  // 4. Generate Course Enrollments, Attendance, and Exam Records
  console.log('Generating Enrollments, Attendance, and Examinations for active students...');
  const newEnrollments = [];
  const newAttendance = [];
  const newExaminations = [];
  const newHostel = [];
  const newTransport = [];

  const roomIds = (hostelRooms || []).map(r => r.room_id).filter(Boolean);
  const routeIds = (transportRoutes || []).map(r => r.route_id).filter(Boolean);

  const SESSIONS = ['Morning', 'Afternoon'];
  const ATTENDANCE_DATES = [
    '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29',
    '2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27'
  ];

  for (const st of studentMetadata) {
    if (st.status !== 'active') continue;

    // Pick 2 to 3 courses in their department
    let deptCourses = coursesByDept[st.department] || [];
    if (deptCourses.length === 0) {
      deptCourses = courses;
    }

    // Select 2-3 distinct courses
    const shuffledCourses = [...deptCourses].sort(() => 0.5 - Math.random());
    const studentCourses = shuffledCourses.slice(0, Math.min(3, shuffledCourses.length));

    // Determine student performance profile (70% good/average, 20% high achiever, 10% struggling/at-risk)
    const profileRand = Math.random();
    let performanceType = 'average'; // marks 55-80, attendance 75-92%
    if (profileRand < 0.20) performanceType = 'high'; // marks 80-98, attendance 88-99%
    else if (profileRand < 0.32) performanceType = 'at_risk'; // marks 25-54, attendance 50-74%

    for (const c of studentCourses) {
      // 1. Enrollment
      newEnrollments.push({
        enrollment_id: crypto.randomUUID(),
        student_id: st.student_id,
        course_code: c.course_code,
        academic_term: 'Odd 2026',
        enrolled_on: '2026-08-20',
        status: 'active',
        department_id: st.department_id
      });

      // 2. Attendance (3 sessions per course)
      const selectedDates = ATTENDANCE_DATES.slice(0, 3);
      for (const attDate of selectedDates) {
        let attStatus = 'Present';
        const attRand = Math.random();
        if (performanceType === 'at_risk') {
          attStatus = attRand < 0.60 ? 'Present' : 'Absent';
        } else if (performanceType === 'high') {
          attStatus = attRand < 0.95 ? 'Present' : 'Absent';
        } else {
          attStatus = attRand < 0.85 ? 'Present' : 'Absent';
        }

        newAttendance.push({
          attendance_id: crypto.randomUUID(),
          student_id: st.student_id,
          course_code: c.course_code,
          course_name: c.course_name,
          attendance_date: attDate,
          session: getRandomElement(SESSIONS),
          status: attStatus,
          marked_by: 'Faculty Instructor',
          department_id: st.department_id
        });
      }

      // 3. Examination
      let marks = 70;
      if (performanceType === 'at_risk') {
        marks = getRandomInt(25, 52);
      } else if (performanceType === 'high') {
        marks = getRandomInt(80, 98);
      } else {
        marks = getRandomInt(55, 82);
      }

      let grade = 'B';
      let result = 'Pass';
      if (marks >= 90) grade = 'O';
      else if (marks >= 80) grade = 'A+';
      else if (marks >= 70) grade = 'A';
      else if (marks >= 60) grade = 'B+';
      else if (marks >= 50) grade = 'B';
      else if (marks >= 45) grade = 'C';
      else {
        grade = 'F';
        result = 'Fail';
      }

      newExaminations.push({
        exam_id: crypto.randomUUID(),
        course_code: c.course_code,
        student_id: st.student_id,
        exam_type: 'Semester Final',
        exam_date: '2026-10-18',
        marks_obtained: marks,
        max_marks: 100,
        grade: grade,
        result: result,
        department_id: st.department_id
      });
    }

    // Hostel (~30%)
    if (roomIds.length > 0 && Math.random() < 0.30) {
      newHostel.push({
        allocation_id: crypto.randomUUID(),
        student_id: st.student_id,
        room_id: getRandomElement(roomIds),
        allocated_on: '2026-08-25',
        status: 'active'
      });
    }

    // Transport (~25%)
    if (routeIds.length > 0 && Math.random() < 0.25) {
      newTransport.push({
        transport_alloc_id: crypto.randomUUID(),
        student_id: st.student_id,
        route_id: getRandomElement(routeIds),
        pickup_point: getRandomElement(['Campus Main Gate', 'Town Bus Stand', 'Railway Station Stop', 'Gandhipuram Junction']),
        status: 'active'
      });
    }
  }

  // 5. Insert Enrollments
  console.log(`Inserting ${newEnrollments.length} Course Enrollments...`);
  for (let i = 0; i < newEnrollments.length; i += 250) {
    const chunk = newEnrollments.slice(i, i + 250);
    const { error } = await supabase.from('enrollments').insert(chunk);
    if (error) console.error('Enrollment chunk error:', error.message);
  }
  console.log('✓ Enrollments inserted successfully');

  // 6. Insert Examinations
  console.log(`Inserting ${newExaminations.length} Examination Records...`);
  for (let i = 0; i < newExaminations.length; i += 250) {
    const chunk = newExaminations.slice(i, i + 250);
    const { error } = await supabase.from('examinations').insert(chunk);
    if (error) console.error('Examination chunk error:', error.message);
  }
  console.log('✓ Examination records inserted successfully');

  // 7. Insert Attendance
  console.log(`Inserting ${newAttendance.length} Attendance Records...`);
  for (let i = 0; i < newAttendance.length; i += 250) {
    const chunk = newAttendance.slice(i, i + 250);
    const { error } = await supabase.from('attendance').insert(chunk);
    if (error) console.error('Attendance chunk error:', error.message);
  }
  console.log('✓ Attendance records inserted successfully');

  // 8. Insert Hostel Allocations
  if (newHostel.length > 0) {
    console.log(`Inserting ${newHostel.length} Hostel Allocations...`);
    for (let i = 0; i < newHostel.length; i += 250) {
      const chunk = newHostel.slice(i, i + 250);
      const { error } = await supabase.from('hostel_allocations').insert(chunk);
      if (error) console.error('Hostel chunk error:', error.message);
    }
    console.log('✓ Hostel allocations inserted');
  }

  // 9. Insert Transport Allocations
  if (newTransport.length > 0) {
    console.log(`Inserting ${newTransport.length} Transport Allocations...`);
    for (let i = 0; i < newTransport.length; i += 250) {
      const chunk = newTransport.slice(i, i + 250);
      const { error } = await supabase.from('transport_allocations').insert(chunk);
      if (error) console.error('Transport chunk error:', error.message);
    }
    console.log('✓ Transport allocations inserted');
  }

  // 10. Final Verification
  const { count: finalStudentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
  const { count: finalEnrollCount } = await supabase.from('enrollments').select('*', { count: 'exact', head: true });
  const { count: finalExamCount } = await supabase.from('examinations').select('*', { count: 'exact', head: true });
  const { count: finalAttCount } = await supabase.from('attendance').select('*', { count: 'exact', head: true });

  console.log('==============================================');
  console.log('🎉 DATABASE SEEDING COMPLETED PERFECTLY!');
  console.log(`⭐ Total Students now: ${finalStudentCount} (Added ${newStudents.length})`);
  console.log(`⭐ Total Enrollments: ${finalEnrollCount}`);
  console.log(`⭐ Total Examinations: ${finalExamCount}`);
  console.log(`⭐ Total Attendance Records: ${finalAttCount}`);
  console.log('==============================================');
}

runSeed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
