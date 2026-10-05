const Conversation = require('../models/Conversation');
const Turn = require('../models/Turn');
const config = require('../config');

async function getConversation(req, res, next) {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findOne({ conversationId: id }).lean();
    // Same 404 for "doesn't exist" and "belongs to someone else", so ids can't be probed.
    const orgId = req.user.orgId || config.defaultOrgId;
    if (!conversation || conversation.studentId !== req.user.studentId || conversation.orgId !== orgId) {
      return res.status(404).json({ error: 'not_found', message: 'No conversation with that id.' });
    }
    const turns = await Turn.find({ conversationId: id }).sort({ createdAt: 1 }).lean();
    return res.json({ conversation, turns });
  } catch (err) {
    next(err);
  }
}

module.exports = { getConversation };
