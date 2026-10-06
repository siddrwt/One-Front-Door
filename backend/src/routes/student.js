const express = require('express');
const { getMyProfile, getMyTickets } = require('../controllers/studentController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', requireAuth, getMyProfile);
router.get('/tickets', requireAuth, getMyTickets);

module.exports = router;
