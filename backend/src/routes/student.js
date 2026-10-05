const express = require('express');
const { getMyProfile } = require('../controllers/studentController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', requireAuth, getMyProfile);

module.exports = router;
