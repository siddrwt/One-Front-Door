const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const chatRoutes = require('./routes/chat');
const conversationRoutes = require('./routes/conversations');
const feedbackRoutes = require('./routes/feedback');
const evaluationRoutes = require('./routes/evaluation');
const domainRoutes = require('./routes/domains');
const ticketRoutes = require('./routes/tickets');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { aiHealth } = require('./controllers/healthController');
const config = require('./config');

const app = express();

if (config.trustProxy) app.set('trust proxy', config.trustProxy); // needed behind Render/Railway so rate limits see real IPs

// Request id: lets one chat be followed across Node logs and the AI service.
app.use((req, res, next) => {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && /^[\w-]{1,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use(helmet());
// CORS_ORIGIN (comma-separated) locks this to the frontend; empty = allow all (dev only).
app.use(config.corsOrigins.length ? cors({ origin: config.corsOrigins }) : cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', ai: config.useMockAi ? 'mock' : 'live' }));
app.get('/health/ai', aiHealth);

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/tickets', ticketRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
