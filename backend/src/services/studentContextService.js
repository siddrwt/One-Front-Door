const User = require('../models/User');

/**
 * The logged-in student's own record, in the shape sent to the AI service as
 * `student_context`. Exactly five fields -- nothing else about the student
 * (no name, email, id or password hash) leaves this backend.
 *
 * Always looked up by the studentId from the verified JWT, never from the
 * request body. The values are fixed demo data, not a real student system.
 */
async function getStudentContext(studentId) {
  const user = await User.findOne({ studentId }).lean();
  if (!user) return null;
  const p = user.profile || {};
  return {
    program: p.program ?? null,
    semester: p.semester ?? null,
    attendance_percent: p.attendancePercent ?? null,
    fee_balance: p.feeBalance ?? null,
    hostel_room: p.hostelRoom ?? null,
  };
}

module.exports = { getStudentContext };
