
import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { AuditLog } from '../entities/AuditLog';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const getRepo = () => AppDataSource.getRepository(AuditLog);

// GET /api/audit-logs
router.get('/', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        const repo = getRepo();
        const logs = await repo.find({
            order: { createdAt: 'DESC' },
            take: 100,
            relations: ['user']
        });

        const formatted = logs.map(l => ({
            id: l.id,
            action: l.action,
            user: l.user?.fullName || 'System',
            detail: l.details || '',
            time: l.createdAt.toLocaleString(),
            type: l.action.includes('DELETE') || l.action.includes('FAIL') ? 'error' : 
                  l.action.includes('UPDATE') ? 'warning' : 'info'
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

export default router;
