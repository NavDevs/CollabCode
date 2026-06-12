const Redis = require('ioredis');

let redis = null;
let isRedisConnected = false;

try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        console.warn('⚠️  Redis: Max retries reached. Running without Redis.');
        return null; // Stop retrying
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redis.on('connect', () => {
    isRedisConnected = true;
    console.log('✅ Redis connected');
  });

  redis.on('error', (err) => {
    isRedisConnected = false;
    console.warn(`⚠️  Redis error: ${err.message}. App will continue without Redis.`);
  });

  redis.on('close', () => {
    isRedisConnected = false;
  });
} catch (error) {
  console.warn(`⚠️  Redis initialization failed: ${error.message}. Running without Redis.`);
}

const connectRedis = async () => {
  if (!redis) return;
  try {
    await redis.connect();
  } catch (error) {
    console.warn(`⚠️  Redis connection failed: ${error.message}. App will continue without Redis.`);
  }
};

const isConnected = () => isRedisConnected;

module.exports = { redis, connectRedis, isConnected };
