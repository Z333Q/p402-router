import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000)
})

// Suppress unhandled error events (common during build or local dev without Redis)
redis.on('error', (err) => {
    if (process.env.NODE_ENV !== 'production') {
        // console.warn('[Redis] Connection warning:', err.message)
    }
})

export default redis
