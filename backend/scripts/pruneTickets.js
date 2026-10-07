const mongoose = require('mongoose');
const config = require('../src/config');
const Ticket = require('../src/models/Ticket');

async function main() {
  await mongoose.connect(config.mongoUri);
  const allTickets = await Ticket.find().sort({ createdAt: -1 });
  console.log('Total tickets before cleanup:', allTickets.length);

  // Keep top 5 tickets
  const keepTickets = allTickets.slice(0, 5);
  const keepIds = keepTickets.map((t) => t._id);

  // Diverse status for a realistic dashboard
  const statuses = ['open', 'in_progress', 'open', 'resolved', 'in_progress'];
  for (let i = 0; i < keepTickets.length; i++) {
    keepTickets[i].status = statuses[i] || 'open';
    await keepTickets[i].save();
  }

  const deleteResult = await Ticket.deleteMany({ _id: { $nin: keepIds } });
  console.log('Deleted old tickets:', deleteResult.deletedCount);

  const finalCount = await Ticket.countDocuments();
  console.log('Current total tickets:', finalCount);

  const remaining = await Ticket.find().sort({ createdAt: -1 });
  remaining.forEach((t, idx) => {
    console.log(`#${idx + 1}: [${t.status.toUpperCase()}] ${t.ticketId.slice(0, 8)}... - ${t.query}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
