const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Ticket = require('../models/Ticket');
const config = require('../config');

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

async function getMyTickets(req, res, next) {
  try {
    const orgId = req.user.orgId || config.defaultOrgId;
    const studentId = req.user.studentId;

    // Find all conversations belonging to this student
    const conversations = await Conversation.find({ studentId, orgId })
      .select('conversationId')
      .lean();
    const conversationIds = conversations.map((c) => c.conversationId);

    // Retrieve all tickets created across the student's conversations
    const tickets = await Ticket.find({
      orgId,
      conversationId: { $in: conversationIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ tickets });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyProfile, getMyTickets };
