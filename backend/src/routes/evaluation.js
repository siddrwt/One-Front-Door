const express = require('express');
const { getEvaluation } = require('../controllers/evaluationController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, getEvaluation);

module.exports = router;
