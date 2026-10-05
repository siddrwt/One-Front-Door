const User = require('../models/User');

async function getMyProfile(req, res, next) {
  try {
    const user = await User.findOne({ studentId: req.user.studentId }).lean();
    if (!user) {
      return res.status(404).json({ error: 'not_found', message: 'Student not found.' });
    }
    return res.json({
      studentId: user.studentId,
      name: user.name,
      orgId: user.orgId,
      profile: user.profile, // fixed dummy dashboard data
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyProfile };
