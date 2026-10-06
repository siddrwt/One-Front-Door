/**
 * Creates exactly the 2 demo students for the hackathon demo, each with
 * fixed/dummy dashboard data (attendance, fee balance, hostel room).
 * Safe to run multiple times — skips a student if their email already exists.
 *
 * Run: npm run seed:students
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const User = require('../src/models/User');

const DEMO_STUDENT_PASSWORD = process.env.DEMO_STUDENT_PASSWORD || 'demoPass123';

function sanitizeMongoUri(uri) {
  if (!uri) return '';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

const DEMO_STUDENTS = [
  {
    studentId: 'BU2023CSE045',
    name: 'Aryan Sharma',
    email: 'aryan.sharma@demo.camu.edu',
    password: DEMO_STUDENT_PASSWORD,
    orgId: 'bennett-university',
    profile: {
      program: 'B.Tech CSE',
      semester: 5,
      attendancePercent: 87,
      feeBalance: 0,
      hostelRoom: 'C-204',
    },
  },
  {
    studentId: 'BU2023ECE012',
    name: 'Priya Verma',
    email: 'priya.verma@demo.camu.edu',
    password: DEMO_STUDENT_PASSWORD,
    orgId: 'bennett-university',
    profile: {
      program: 'B.Tech ECE',
      semester: 3,
      attendancePercent: 91,
      feeBalance: 15000,
      hostelRoom: 'A-118',
    },
  },
];

async function seedDemoStudents() {
  for (const student of DEMO_STUDENTS) {
    const existing = await User.findOne({ email: student.email });
    if (existing) {
      console.log(`[seed] skipping ${student.email} — already exists`);
      continue;
    }

    const passwordHash = await bcrypt.hash(student.password, 10);
    await User.create({
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      passwordHash,
      orgId: student.orgId,
      profile: student.profile,
    });
    console.log(`[seed] created ${student.name} (${student.email})`);
  }
}

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log(`[seed] connected to ${sanitizeMongoUri(config.mongoUri)}`);
  await seedDemoStudents();
  await mongoose.disconnect();
  console.log('[seed] done');
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });
}

module.exports = { seedDemoStudents };
