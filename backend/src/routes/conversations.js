const express = require('express');
const { getConversation } = require('../controllers/conversationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', requireAuth, getConversation);

module.exports = router;
