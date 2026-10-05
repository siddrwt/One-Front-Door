const express = require('express');
const { submitFeedback } = require('../controllers/feedbackController');
const { validateFeedbackRequest } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, validateFeedbackRequest, submitFeedback);

module.exports = router;
