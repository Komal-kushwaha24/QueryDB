/**
 * Isolated Mock Responses for QueryDB Dashboard
 * Follows API Contract v1.0 specifications for AI Generation and Query Execution.
 */

export const MOCK_DATABASE_INFO = {
  name: 'My College DB',
  type: 'PostgreSQL',
  version: '15.4',
  host: 'localhost:5432',
  status: 'connected',
  schema: 'public',
  tablesCount: 5,
};

export const MOCK_SCHEMA_METADATA = [
  {
    name: 'students',
    description: 'Enrolled college students record',
    columns: [
      { name: 'id', dataType: 'integer', isPrimaryKey: true },
      { name: 'name', dataType: 'varchar(100)', isNullable: false },
      { name: 'department', dataType: 'varchar(50)', isNullable: false },
      { name: 'cgpa', dataType: 'numeric(3,2)', isNullable: false },
      { name: 'city', dataType: 'varchar(50)', isNullable: true },
      { name: 'skills', dataType: 'varchar(200)', isNullable: true },
    ],
  },
  {
    name: 'companies',
    description: 'Campus recruiting companies',
    columns: [
      { name: 'id', dataType: 'integer', isPrimaryKey: true },
      { name: 'name', dataType: 'varchar(100)', isNullable: false },
      { name: 'sector', dataType: 'varchar(50)', isNullable: true },
      { name: 'city', dataType: 'varchar(50)', isNullable: true },
    ],
  },
  {
    name: 'placements',
    description: 'Placement offers received by students',
    columns: [
      { name: 'id', dataType: 'integer', isPrimaryKey: true },
      { name: 'student_id', dataType: 'integer', isForeignKey: true },
      { name: 'company_id', dataType: 'integer', isForeignKey: true },
      { name: 'package', dataType: 'numeric(5,2)', isNullable: false },
      { name: 'placement_date', dataType: 'date', isNullable: true },
    ],
  },
  {
    name: 'courses',
    description: 'Academic course offerings',
    columns: [
      { name: 'id', dataType: 'integer', isPrimaryKey: true },
      { name: 'name', dataType: 'varchar(120)', isNullable: false },
      { name: 'department', dataType: 'varchar(50)', isNullable: false },
      { name: 'credits', dataType: 'integer', isNullable: false },
    ],
  },
  {
    name: 'attendance',
    description: 'Student course attendance records',
    columns: [
      { name: 'id', dataType: 'integer', isPrimaryKey: true },
      { name: 'student_id', dataType: 'integer', isForeignKey: true },
      { name: 'course_id', dataType: 'integer', isForeignKey: true },
      { name: 'percentage', dataType: 'numeric(5,2)', isNullable: false },
    ],
  },
];

export const MOCK_QUERIES = [
  {
    id: 'cse-15lpa',
    questionPattern: /cse.*15|placed.*above 15|15.*lpa/i,
    question: 'Which CSE students got placed above 15 LPA?',
    sql: `SELECT s.name AS student, c.name AS company, CONCAT(p.package, ' LPA') AS package\nFROM students s\nJOIN placements p ON s.id = p.student_id\nJOIN companies c ON c.id = p.company_id\nWHERE s.department = 'CSE'\n  AND p.package > 15;`,
    explanation: 'This query retrieves Computer Science students who were placed with compensation exceeding 15 LPA, joined with their recruiting companies.',
    understanding: {
      tables: ['students', 'placements', 'companies'],
      filters: ['department = CSE', 'package > 15 LPA'],
      ambiguityCheck: 'Clear - no question needed',
      safetyCheck: 'SELECT only - passed',
      retrievedContext: [
        'Table: students (id, name, department, cgpa)',
        'Table: placements (student_id, company_id, package in LPA)',
        'Table: companies (id, name, tier)',
        'Relationship: students.id = placements.student_id',
        'Relationship: companies.id = placements.company_id',
      ],
    },
    columns: ['student', 'company', 'package'],
    rows: [
      { student: 'Rahul', company: 'Google', package: '20 LPA' },
      { student: 'Aman', company: 'Microsoft', package: '18 LPA' },
    ],
    executionTimeMs: 14.2,
  },
  {
    id: 'cgpa-above-8',
    questionPattern: /cgpa.*8|greater than 8|above 8/i,
    question: 'Find students whose CGPA is greater than 8',
    sql: `SELECT id, name, department, cgpa\nFROM students\nWHERE cgpa > 8.0\nORDER BY cgpa DESC;`,
    explanation: 'This query selects student records where CGPA strictly exceeds 8.0, sorted from highest to lowest score.',
    understanding: {
      tables: ['students'],
      filters: ['cgpa > 8.0'],
      ambiguityCheck: 'Clear - no question needed',
      safetyCheck: 'SELECT only - passed',
      retrievedContext: [
        'Table: students (id, name, department, cgpa, year)',
        'Rule: CGPA is represented as numeric(3,2) between 0.00 and 10.00',
      ],
    },
    columns: ['id', 'name', 'department', 'cgpa'],
    rows: [
      { id: 101, name: 'Rahul Sharma', department: 'CSE', cgpa: 9.42 },
      { id: 104, name: 'Priya Patel', department: 'ECE', cgpa: 8.95 },
      { id: 102, name: 'Aman Gupta', department: 'CSE', cgpa: 8.78 },
      { id: 107, name: 'Sneha Reddy', department: 'IT', cgpa: 8.65 },
      { id: 112, name: 'Vikram Singh', department: 'ME', cgpa: 8.24 },
      { id: 115, name: 'Ananya Roy', department: 'EE', cgpa: 8.12 },
    ],
    executionTimeMs: 11.5,
  },
  {
    id: 'all-companies',
    questionPattern: /companies|recruiters|hiring/i,
    question: 'Show all companies that offered placements',
    sql: `SELECT c.name AS company, c.industry, COUNT(p.id) AS offers_made, ROUND(AVG(p.package), 2) AS avg_package_lpa\nFROM companies c\nJOIN placements p ON c.id = p.company_id\nGROUP BY c.id, c.name, c.industry\nORDER BY avg_package_lpa DESC;`,
    explanation: 'Aggregates all placement offers and calculates average package offered by each company.',
    understanding: {
      tables: ['companies', 'placements'],
      filters: ['placements count > 0'],
      ambiguityCheck: 'Clear - no question needed',
      safetyCheck: 'SELECT only - passed',
      retrievedContext: [
        'Table: companies (id, name, industry, tier)',
        'Table: placements (company_id, package)',
      ],
    },
    columns: ['company', 'industry', 'offers_made', 'avg_package_lpa'],
    rows: [
      { company: 'Google', industry: 'Technology', offers_made: 3, avg_package_lpa: '22.5 LPA' },
      { company: 'Microsoft', industry: 'Software', offers_made: 5, avg_package_lpa: '19.8 LPA' },
      { company: 'Amazon', industry: 'E-commerce & Cloud', offers_made: 7, avg_package_lpa: '17.2 LPA' },
      { company: 'Adobe', industry: 'Creative Software', offers_made: 2, avg_package_lpa: '16.0 LPA' },
      { company: 'Infosys', industry: 'IT Services', offers_made: 18, avg_package_lpa: '7.5 LPA' },
    ],
    executionTimeMs: 18.1,
  },
  {
    id: 'empty-results',
    questionPattern: /cgpa.*10|package.*above 100|cgpa > 10/i,
    question: 'Find students with CGPA above 10',
    sql: `SELECT id, name, department, cgpa\nFROM students\nWHERE cgpa > 10.0;`,
    explanation: 'Queries for any students with a CGPA exceeding 10.0.',
    understanding: {
      tables: ['students'],
      filters: ['cgpa > 10.0'],
      ambiguityCheck: 'Clear - no question needed',
      safetyCheck: 'SELECT only - passed',
      retrievedContext: ['Table: students (cgpa)'],
    },
    columns: ['id', 'name', 'department', 'cgpa'],
    rows: [],
    executionTimeMs: 9.4,
  },
  {
    id: 'large-result-set',
    questionPattern: /all.*students|list.*students|every.*student|enrolled.*students/i,
    question: 'List all enrolled students in college',
    sql: `SELECT s.id, s.name, s.department, s.year, s.cgpa\nFROM students s\nORDER BY s.id ASC;`,
    explanation: 'Fetches the complete directory of enrolled students across all departments and academic years.',
    understanding: {
      tables: ['students'],
      filters: ['None (Full Scan)'],
      ambiguityCheck: 'Clear - no question needed',
      safetyCheck: 'SELECT only - passed',
      retrievedContext: ['Table: students (all columns)'],
    },
    columns: ['id', 'name', 'department', 'year', 'cgpa'],
    rows: [
      { id: 101, name: 'Rahul Sharma', department: 'CSE', year: 4, cgpa: 9.42 },
      { id: 102, name: 'Aman Gupta', department: 'CSE', year: 4, cgpa: 8.78 },
      { id: 103, name: 'Deepak Verma', department: 'CSE', year: 3, cgpa: 7.91 },
      { id: 104, name: 'Priya Patel', department: 'ECE', year: 4, cgpa: 8.95 },
      { id: 105, name: 'Rohan Mehra', department: 'ECE', year: 3, cgpa: 7.64 },
      { id: 106, name: 'Simran Kaur', department: 'ECE', year: 2, cgpa: 8.10 },
      { id: 107, name: 'Sneha Reddy', department: 'IT', year: 4, cgpa: 8.65 },
      { id: 108, name: 'Kunal Joshi', department: 'IT', year: 3, cgpa: 7.45 },
      { id: 109, name: 'Pooja Iyer', department: 'IT', year: 2, cgpa: 8.35 },
      { id: 110, name: 'Mohit Rao', department: 'ME', year: 4, cgpa: 7.82 },
      { id: 111, name: 'Harshit Saxena', department: 'ME', year: 3, cgpa: 7.15 },
      { id: 112, name: 'Vikram Singh', department: 'ME', year: 4, cgpa: 8.24 },
      { id: 113, name: 'Nikhil Jain', department: 'CE', year: 4, cgpa: 7.30 },
      { id: 114, name: 'Kavita Das', department: 'CE', year: 3, cgpa: 7.88 },
      { id: 115, name: 'Ananya Roy', department: 'EE', year: 4, cgpa: 8.12 },
      { id: 116, name: 'Gaurav Kumar', department: 'EE', year: 2, cgpa: 7.55 },
      { id: 117, name: 'Tanvi Shinde', department: 'CSE', year: 2, cgpa: 8.90 },
      { id: 118, name: 'Aditya Bhatt', department: 'IT', year: 1, cgpa: 8.40 },
    ],
    executionTimeMs: 24.6,
  },
];

/**
 * Handle ambiguous questions matching the API Contract clarify response
 */
export const MOCK_AMBIGUOUS_QUESTIONS = [
  {
    pattern: /top students|best students|rank students/i,
    question: 'Show the top students',
    needsClarification: true,
    clarificationQuestion: 'Do you want to rank students by CGPA or placement package?',
    options: [
      'Rank by CGPA (Academic)',
      'Rank by Placement Package (Salary)',
      'Rank by Credits Completed',
    ],
  },
];

/**
 * Handle unsafe SQL / destructive prompts
 */
export const MOCK_UNSAFE_PATTERNS = [
  /drop\s+table/i,
  /delete\s+from/i,
  /truncate/i,
  /alter\s+table/i,
  /insert\s+into/i,
  /update\s+students/i,
];
