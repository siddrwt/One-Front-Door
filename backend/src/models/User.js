const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, index: true }, // e.g. "BU2023CSE045"
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    orgId: { type: String, required: true, default: 'bennett-university' },

    // Fixed/dummy dashboard data — NOT connected to any real student
    // information system. Same fields for every student, values set once
    // at seed time. This is what /api/student/profile serves.
    profile: {
      program: { type: String, default: 'B.Tech CSE' },
      semester: { type: Number, default: 5 },
      attendancePercent: { type: Number, default: 87 },
      feeBalance: { type: Number, default: 0 },
      hostelRoom: { type: String, default: 'N/A' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
