require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const { initSupabase } = require('./config/supabase');
const { initRedis } = require('./config/redis');
const { setupWebhookQueue } = require('./services/queueService');

// Routes
const authRoutes = require('./routes/auth');
const repoRoutes = require('./routes/repos');
const reviewRoutes = require('./routes/reviews');
const analyticsRoutes = require('./routes/analytics');
const webhookRoutes = require('./routes/webhooks');
const badgeRoutes = require('./routes/badges');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io available to routes
app.set('io', io);

// ─── Raw body capture for GitHub webhook HMAC verification ───────────────────
// Must be registered BEFORE express.json() for the webhook route.
app.use('/api/webhooks/github', express.raw({ type: 'application/json' }), (req, _res, next) => {
  // Attach raw buffer so webhooks.js can verify the HMAC signature correctly.
  req.rawBody = req.body;
  // Re-parse body as JSON for the rest of the handler
  try {
    req.body = JSON.parse(req.rawBody.toString('utf8'));
  } catch {
    req.body = {};
  }
  next();
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/repos', repoRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/badges', badgeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-review', (reviewId) => {
    socket.join(`review-${reviewId}`);
  });

  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

async function initializeServices() {
  try {
    await connectDB();
    initSupabase();
    await initRedis();
    setupWebhookQueue(io);
  } catch (error) {
    console.error('Service initialization warning:', error);

    if (!process.env.VERCEL) {
      throw error;
    }
  }
}

async function startServer() {
  try {
    await initializeServices();

    if (process.env.VERCEL) {
      console.log('Vercel runtime detected; skipping long-lived server startup.');
      return;
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);

    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

startServer();

module.exports = app;
