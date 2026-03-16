const Redis = require('ioredis');

let redis = null;

const initRedis = async () => {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    // Attach error handler to prevent unhandled error events when Redis is unavailable
    redis.on('error', (err) => {
      console.warn('⚠️  Redis error:', err.message);
    });

    redis.on('connect', () => {
      console.log('✅ Redis connect event');
    });

    await redis.connect();
    console.log('✅ Redis connected');
  } catch (error) {
    console.warn('⚠️  Redis unavailable — queue system disabled:', error.message);
    if (redis) {
      try { redis.disconnect(); } catch (e) { /* ignore */ }
    }
    redis = null;
  }
};

const getRedis = () => redis;

module.exports = { initRedis, getRedis };
