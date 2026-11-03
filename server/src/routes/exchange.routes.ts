
import { Router } from 'express';
import { ExchangeRateService } from '../services/exchangeRateService';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const rates = await ExchangeRateService.getRates();
        res.json(rates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
});

export default router;
