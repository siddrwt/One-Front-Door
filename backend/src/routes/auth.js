const express = require('express');
const { signup, login } = require('../controllers/authController');
const { validateSignup, validateLogin } = require('../middleware/validateAuth');
const { authRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/signup', authRateLimiter, validateSignup, signup);
router.post('/login', authRateLimiter, validateLogin, login);

module.exports = router;
