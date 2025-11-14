// backend/redisClient.js
const redis = require('redis');

// Create Redis client (default: localhost:6379)
const client = redis.createClient({
  url: 'redis://127.0.0.1:6379'
});

// Event listeners
client.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

client.on('connect', () => {
  console.log('🔌 Redis client connected');
});

client.on('ready', () => {
  console.log('✅ Redis ready for teacher storage');
});

// Connect (Redis v4+ requires async connect)
(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error('Redis connection failed:', err);
  }
})();

module.exports = client;
