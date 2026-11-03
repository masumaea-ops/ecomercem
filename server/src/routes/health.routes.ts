
import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { redis } from '../config/redis';

const router = Router();

router.get('/', async (req, res) => {
    const health = {
        server: 'Online',
        database: 'Unknown',
        redis: 'Unknown',
        uptime: (process as any).uptime(),
        timestamp: new Date()
    };

    // Check DB
    try {
        if (AppDataSource.isInitialized) {
            health.database = 'Connected';
        } else {
            health.database = 'Disconnected';
        }
    } catch (e) {
        health.database = 'Error';
    }

    // Check Redis
    try {
        if (!redis) {
            health.redis = 'Disabled';
        } else if (redis.status === 'ready') {
            health.redis = 'Connected';
        } else {
            health.redis = redis.status;
        }
    } catch (e) {
        health.redis = 'Error';
    }

    const status = (health.database === 'Connected' && (health.redis === 'Connected' || health.redis === 'Disabled')) ? 200 : 503;
    res.status(status).json(health);
});

export default router;
