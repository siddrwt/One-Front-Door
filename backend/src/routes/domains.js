const express = require('express');
const { getDomains } = require('../controllers/domainController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getDomains);

module.exports = router;
