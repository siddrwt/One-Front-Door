const Ticket = require('../models/Ticket');

async function createTicket({ conversationId, orgId, query, reason }) {
  const ticket = await Ticket.create({
    conversationId,
    orgId,
    query,
    reason: reason || 'low_routing_confidence',
  });
  return ticket;
}

async function listTickets({ orgId, status } = {}) {
  const filter = {};
  if (orgId) filter.orgId = orgId;
  if (status) filter.status = status;
  return Ticket.find(filter).sort({ createdAt: -1 }).limit(100);
}

module.exports = { createTicket, listTickets };
