const express = require('express');
const { handleChat } = require('../controllers/chatController');
const { validateChatRequest } = require('../middleware/validate');
const { chatRateLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, chatRateLimiter, validateChatRequest, handleChat);

module.exports = router;
