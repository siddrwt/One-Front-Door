const express = require('express');
const { getTickets } = require('../controllers/ticketController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, getTickets);

module.exports = router;
