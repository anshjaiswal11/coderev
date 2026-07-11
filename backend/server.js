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

// Allow all origins dynamically to prevent CORS issues (needed for frontend/backend on separate domains)
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};

// Socket.IO setup
const io = new Server(server, {
  cors: corsOptions,
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
app.use(cors(corsOptions));
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

// Health check / diagnostics
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  // Reconstruct what the OAuth callback URL would be (mirrors auth.js logic)
  const envCallback = process.env.GITHUB_CALLBACK_URL;
  const isLocalhostCallback = envCallback && (envCallback.includes('localhost') || envCallback.includes('127.0.0.1'));
  const dynamicCallback = `${req.protocol}://${req.get('host')}/api/auth/github/callback`;
  const effectiveCallback = (envCallback && !isLocalhostCallback) ? envCallback : dynamicCallback;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: dbState[mongoose.connection.readyState] || 'unknown',
    env: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URI ? (process.env.MONGODB_URI.includes('localhost') ? '⚠️  localhost (will fail on Vercel)' : '✅ set') : '❌ missing',
    openrouterKey: process.env.OPENROUTER_API_KEY ? '✅ set' : '❌ missing',
    jwtSecret: process.env.JWT_SECRET ? '✅ set' : '❌ using dev-secret',
    frontendUrl: process.env.FRONTEND_URL || '(not set — will try to auto-detect)',
    githubClientId: process.env.GITHUB_CLIENT_ID ? '✅ set' : '❌ missing',
    githubCallbackUrl: {
      envVar: envCallback || '(not set)',
      isLocalhostValue: isLocalhostCallback || false,
      effectiveCallbackUrl: effectiveCallback,
      warning: isLocalhostCallback ? '⚠️  GITHUB_CALLBACK_URL points to localhost — will cause redirect_uri_mismatch on Vercel!' : null,
    },
  });
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
  // Connect to MongoDB — errors are logged but don't kill Vercel
  try {
    await connectDB();
  } catch (error) {
    console.error('⚠️  MongoDB failed to connect:', error.message);
    if (!process.env.VERCEL) throw error;
  }

  // Optional services — always try, never throw
  try { initSupabase(); } catch (e) { console.warn('Supabase init warning:', e.message); }
  try { await initRedis(); } catch (e) { console.warn('Redis init warning:', e.message); }
  try { setupWebhookQueue(io); } catch (e) { console.warn('Queue init warning:', e.message); }
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
