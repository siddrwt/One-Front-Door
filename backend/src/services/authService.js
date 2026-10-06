const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

async function signup({ studentId, name, email, password, orgId }) {
  const existing = await User.findOne({ $or: [{ studentId }, { email }] });
  if (existing) {
    const err = new Error('A student with that ID or email already exists.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    studentId,
    name,
    email,
    passwordHash,
    orgId: orgId || config.defaultOrgId,
  });

  return issueToken(user);
}

async function login({ email, studentId, identifier, password }) {
  const query = email
    ? { email }
    : studentId
    ? { studentId }
    : { $or: [{ email: identifier }, { studentId: identifier }] };

  const user = await User.findOne(query);
  if (!user) {
    const err = new Error('Invalid student ID/email or password.');
    err.status = 401;
    throw err;
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  return issueToken(user);
}

function issueToken(user) {
  const token = jwt.sign(
    { studentId: user.studentId, orgId: user.orgId, name: user.name },
    config.jwtSecret,
    { expiresIn: '12h' }
  );
  return {
    token,
    student: {
      studentId: user.studentId,
      name: user.name,
      email: user.email,
      orgId: user.orgId,
      profile: user.profile,
    },
  };
}

module.exports = { signup, login };
