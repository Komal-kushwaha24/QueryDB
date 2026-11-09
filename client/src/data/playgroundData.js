export const DATABASE_SCHEMA = {
  students: {
    name: 'students',
    description: 'Enrolled university students with academic and personal details',
    columns: [
      { name: 'id', type: 'integer', isPk: true, isFk: false },
      { name: 'name', type: 'varchar(100)', isPk: false, isFk: false },
      { name: 'department', type: 'varchar(30)', isPk: false, isFk: false },
      { name: 'cgpa', type: 'numeric(3,2)', isPk: false, isFk: false },
      { name: 'city', type: 'varchar(80)', isPk: false, isFk: false },
      { name: 'skills', type: 'text', isPk: false, isFk: false },
    ],
  },
  companies: {
    name: 'companies',
    description: 'Recruiting organizations visiting campus for placement drives',
    columns: [
      { name: 'id', type: 'integer', isPk: true, isFk: false },
      { name: 'name', type: 'varchar(100)', isPk: false, isFk: false },
      { name: 'sector', type: 'varchar(80)', isPk: false, isFk: false },
      { name: 'city', type: 'varchar(80)', isPk: false, isFk: false },
    ],
  },
  courses: {
    name: 'courses',
    description: 'Offered departmental courses and credit allocations',
    columns: [
      { name: 'id', type: 'integer', isPk: true, isFk: false },
      { name: 'name', type: 'varchar(120)', isPk: false, isFk: false },
      { name: 'department', type: 'varchar(30)', isPk: false, isFk: false },
      { name: 'credits', type: 'integer', isPk: false, isFk: false },
    ],
  },
  placements: {
    name: 'placements',
    description: 'Junction records linking placed students with hiring companies and packages',
    columns: [
      { name: 'id', type: 'integer', isPk: true, isFk: false },
      { name: 'student_id', type: 'integer', isPk: false, isFk: true, references: 'students.id' },
      { name: 'company_id', type: 'integer', isPk: false, isFk: true, references: 'companies.id' },
      { name: 'package', type: 'numeric(5,2)', isPk: false, isFk: false },
      { name: 'placement_date', type: 'date', isPk: false, isFk: false },
    ],
  },
  attendance: {
    name: 'attendance',
    description: 'Student course attendance records and completion percentages',
    columns: [
      { name: 'id', type: 'integer', isPk: true, isFk: false },
      { name: 'student_id', type: 'integer', isPk: false, isFk: true, references: 'students.id' },
      { name: 'course_id', type: 'integer', isPk: false, isFk: true, references: 'courses.id' },
      { name: 'percentage', type: 'numeric(5,2)', isPk: false, isFk: false },
    ],
  },
};

export const PRESET_QUERIES = [
  {
    id: 'cgpa-leaders',
    category: 'Academic',
    question: 'Show top 5 students by CGPA with department',
    sql: `SELECT id, name, department, cgpa
FROM students
ORDER BY cgpa DESC
LIMIT 5;`,
    explanation: 'Scans the students table, projects student identifiers, name, department, and CGPA, then sorts in descending order to output the top 5 records.',
    executionTime: '8ms',
    tablesUsed: ['students'],
    columns: ['id', 'name', 'department', 'cgpa'],
    rows: [
      { id: 101, name: 'Priya Sharma', department: 'Computer Science', cgpa: '9.85' },
      { id: 104, name: 'Arjun Mehta', department: 'Electronics', cgpa: '9.72' },
      { id: 112, name: 'Sneha Kapoor', department: 'Computer Science', cgpa: '9.65' },
      { id: 108, name: 'Rahul Verma', department: 'Information Tech', cgpa: '9.54' },
      { id: 119, name: 'Ananya Singh', department: 'Mechanical', cgpa: '9.48' },
    ],
  },
  {
    id: 'placement-join',
    category: 'Placements',
    question: 'Which students were placed at top packages and by which companies?',
    sql: `SELECT s.name AS student_name, c.name AS company_name, p.package AS lpa, p.placement_date
FROM placements p
JOIN students s ON p.student_id = s.id
JOIN companies c ON p.company_id = c.id
ORDER BY p.package DESC
LIMIT 5;`,
    explanation: 'Executes a multi-table INNER JOIN connecting placements with students and companies via foreign keys (student_id and company_id), ordering by package in descending order.',
    executionTime: '14ms',
    tablesUsed: ['placements', 'students', 'companies'],
    columns: ['student_name', 'company_name', 'lpa', 'placement_date'],
    rows: [
      { student_name: 'Priya Sharma', company_name: 'Google', lpa: '32.50 LPA', placement_date: '2026-03-15' },
      { student_name: 'Arjun Mehta', company_name: 'Microsoft', lpa: '28.00 LPA', placement_date: '2026-03-18' },
      { student_name: 'Sneha Kapoor', company_name: 'Amazon', lpa: '26.40 LPA', placement_date: '2026-03-22' },
      { student_name: 'Vikram Joshi', company_name: 'Atlassian', lpa: '24.00 LPA', placement_date: '2026-03-25' },
      { student_name: 'Rahul Verma', company_name: 'Cisco', lpa: '19.80 LPA', placement_date: '2026-04-02' },
    ],
  },
  {
    id: 'attendance-alert',
    category: 'Compliance',
    question: 'List students with attendance below 75 percent in any course',
    sql: `SELECT s.name AS student_name, c.name AS course_name, a.percentage
FROM attendance a
JOIN students s ON a.student_id = s.id
JOIN courses c ON a.course_id = c.id
WHERE a.percentage < 75.00
ORDER BY a.percentage ASC;`,
    explanation: 'Filters attendance records where attendance percentage falls strictly below the 75% threshold, joining course and student master tables to highlight deficit cases.',
    executionTime: '11ms',
    tablesUsed: ['attendance', 'students', 'courses'],
    columns: ['student_name', 'course_name', 'percentage'],
    rows: [
      { student_name: 'Rohan Gupta', course_name: 'Distributed Systems', percentage: '61.50%' },
      { student_name: 'Kavita Rao', course_name: 'Database Architecture', percentage: '68.00%' },
      { student_name: 'Amit Patel', course_name: 'Operating Systems', percentage: '71.20%' },
      { student_name: 'Pooja Nair', course_name: 'Compiler Design', percentage: '73.40%' },
    ],
  },
  {
    id: 'department-avg',
    category: 'Analytics',
    question: 'What is the average CGPA per department?',
    sql: `SELECT department, ROUND(AVG(cgpa), 2) AS average_cgpa, COUNT(*) AS student_count
FROM students
GROUP BY department
ORDER BY average_cgpa DESC;`,
    explanation: 'Aggregates student academic scores by department using AVG(cgpa), rounding to 2 decimal places and ordering departments by performance.',
    executionTime: '9ms',
    tablesUsed: ['students'],
    columns: ['department', 'average_cgpa', 'student_count'],
    rows: [
      { department: 'Computer Science', average_cgpa: '8.92', student_count: '120' },
      { department: 'Information Tech', average_cgpa: '8.65', student_count: '85' },
      { department: 'Electronics', average_cgpa: '8.44', student_count: '95' },
      { department: 'Mechanical', average_cgpa: '8.12', student_count: '110' },
    ],
  },
  {
    id: 'ambiguity-demo',
    category: 'Ambiguity',
    question: 'Show top students',
    isAmbiguous: true,
    clarificationQuestion: 'How would you like to rank top students?',
    options: [
      { label: 'By CGPA (Highest GPA first)', resolvedQuery: 'Show top students by CGPA' },
      { label: 'By Placement Package (Highest CTC)', resolvedQuery: 'Which students were placed at top packages?' },
      { label: 'By Course Attendance (Best record)', resolvedQuery: 'Show students with highest attendance' },
    ],
    sql: `SELECT id, name, department, cgpa
FROM students
ORDER BY cgpa DESC
LIMIT 5;`,
    explanation: 'Ambiguity was detected on the subjective term "top". Upon choosing CGPA criterion, the system generated an ORDER BY cgpa DESC query.',
    executionTime: '12ms',
    tablesUsed: ['students'],
    columns: ['id', 'name', 'department', 'cgpa'],
    rows: [
      { id: 101, name: 'Priya Sharma', department: 'Computer Science', cgpa: '9.85' },
      { id: 104, name: 'Arjun Mehta', department: 'Electronics', cgpa: '9.72' },
      { id: 112, name: 'Sneha Kapoor', department: 'Computer Science', cgpa: '9.65' },
    ],
  },
];
