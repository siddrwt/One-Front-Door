const mongoose = require('mongoose');
const Turn = require('../models/Turn');
const Conversation = require('../models/Conversation');
const config = require('../config');

async function submitFeedback(req, res, next) {
  try {
    const { turnId, feedback, category, comment } = req.body;

    if (!mongoose.isObjectIdOrHexString(turnId)) {
      return res.status(400).json({ error: 'validation_error', details: ['turnId is not a valid id'] });
    }

    const turn = await Turn.findById(turnId);
    if (!turn) {
      return res.status(404).json({ error: 'not_found', message: 'No turn with that id.' });
    }

    const conversation = await Conversation.findOne({ conversationId: turn.conversationId }).lean();
    // A student can only rate turns from their own conversations in their organization.
    const orgId = req.user.orgId || config.defaultOrgId;
    if (!conversation || conversation.studentId !== req.user.studentId || conversation.orgId !== orgId || turn.orgId !== orgId) {
      return res.status(404).json({ error: 'not_found', message: 'No turn with that id.' });
    }

    // Feedback can only be submitted for assistant turns
    if (turn.role !== 'assistant') {
      return res.status(400).json({ error: 'validation_error', message: 'Feedback can only be submitted for assistant turns.' });
    }

    turn.feedback = feedback;
    turn.feedbackCategory = category || null;
    turn.category = category || null;
    turn.feedbackComment = typeof comment === 'string' && comment.trim() ? comment.trim() : null;
    turn.comment = turn.feedbackComment;
    turn.feedbackAt = new Date();

    await turn.save();

    const response = {
      turnId: turn._id,
      feedback: turn.feedback,
    };
    if (turn.feedbackCategory) response.category = turn.feedbackCategory;
    if (turn.feedbackComment) response.comment = turn.feedbackComment;

    return res.json(response);
  } catch (err) {
    next(err);
  }
}

module.exports = { submitFeedback };
