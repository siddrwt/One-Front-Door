const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true, index: true, default: uuidv4 },
    conversationId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    query: { type: String, required: true },
    reason: { type: String, default: 'low_routing_confidence' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
