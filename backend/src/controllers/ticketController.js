const { listTickets } = require('../services/ticketService');

async function getTickets(req, res, next) {
  try {
    const { orgId, status } = req.query;
    const tickets = await listTickets({ orgId, status });
    return res.json({ tickets });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTickets };
