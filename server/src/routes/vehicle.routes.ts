
import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { SystemSetting } from '../entities/SystemSetting';

const router = Router();
const getSettingsRepo = () => AppDataSource.getRepository(SystemSetting);

// GET /api/vehicles/decode/:vin
router.get('/decode/:vin', async (req, res) => {
    const { vin } = req.params;
    
    if (!vin || vin.length < 5) {
        return res.status(400).json({ error: 'Invalid VIN' });
    }

    try {
        const settingsRepo = getSettingsRepo();
        const apiKeySetting = await settingsRepo.findOneBy({ key: 'VIN_API_KEY' });
        const apiKey = apiKeySetting?.value;

        // In production: if (apiKey) ... call external API like NHTSA or AutoLoop using this key
        
        // Support both 17-digit VIN and Japanese Domestic Market (JDM) chassis prefixes common in East Africa
        const clean = vin.toUpperCase().replace(/[\s-]/g, '');
        let car = null;

        // Common Toyota JDM & International
        if (clean.startsWith('NZE141') || clean.startsWith('NZE161') || clean.startsWith('NZE121') || clean.startsWith('ZRE142') || clean.startsWith('JT1')) {
            car = 'Toyota Corolla Fielder / Axio';
        } else if (clean.startsWith('ZRT260') || clean.startsWith('NZT260') || clean.startsWith('ZZT240')) {
            car = 'Toyota Premio / Allion';
        } else if (clean.startsWith('KSP130') || clean.startsWith('NSP130') || clean.startsWith('SCP90') || clean.startsWith('NCP131')) {
            car = 'Toyota Vitz / Yaris';
        } else if (clean.startsWith('NCP51') || clean.startsWith('NCP58') || clean.startsWith('NCP160') || clean.startsWith('NLP51')) {
            car = 'Toyota Probox / Succeed';
        } else if (clean.startsWith('GDJ150') || clean.startsWith('TRJ150') || clean.startsWith('GRJ150') || clean.startsWith('KZJ95') || clean.startsWith('KDJ120') || clean.startsWith('JTN')) {
            car = 'Toyota Land Cruiser Prado';
        } else if (clean.startsWith('KDH200') || clean.startsWith('TRH200') || clean.startsWith('LH172')) {
            car = 'Toyota Hiace';
        } else if (clean.startsWith('ZVW30') || clean.startsWith('ZVW50')) {
            car = 'Toyota Prius';
        }
        // Common Subaru JDM & International
        else if (clean.startsWith('SG5') || clean.startsWith('SH5') || clean.startsWith('SJ5') || clean.startsWith('SK9') || clean.startsWith('JF1')) {
            car = 'Subaru Forester';
        } else if (clean.startsWith('BP5') || clean.startsWith('BR9') || clean.startsWith('BM9') || clean.startsWith('BS9')) {
            car = 'Subaru Outback / Legacy';
        } else if (clean.startsWith('GP7') || clean.startsWith('GT7') || clean.startsWith('GJ7')) {
            car = 'Subaru XV / Impreza';
        }
        // Common Nissan JDM & International
        else if (clean.startsWith('T31') || clean.startsWith('T32') || clean.startsWith('NT31') || clean.startsWith('NT32')) {
            car = 'Nissan X-Trail';
        } else if (clean.startsWith('E12') || clean.startsWith('NE12') || clean.startsWith('E11') || clean.startsWith('VN1')) {
            car = 'Nissan Note';
        } else if (clean.startsWith('C26') || clean.startsWith('C27')) {
            car = 'Nissan Serena';
        }
        // Common Honda JDM & International
        else if (clean.startsWith('GK3') || clean.startsWith('GP5') || clean.startsWith('GE6') || clean.startsWith('MRH')) {
            car = 'Honda Fit';
        } else if (clean.startsWith('RU1') || clean.startsWith('RU3')) {
            car = 'Honda Vezel';
        }
        // Common Mazda JDM & International
        else if (clean.startsWith('DJ5FS') || clean.startsWith('DE3FS') || clean.startsWith('JMZ')) {
            car = 'Mazda Demio';
        } else if (clean.startsWith('KE2FW') || clean.startsWith('KF2P')) {
            car = 'Mazda CX-5';
        }
        // General Brand Fallbacks from VIN
        else if (clean.startsWith('JTD') || clean.startsWith('JTE')) {
            car = 'Toyota Vehicle';
        } else if (clean.startsWith('JN1')) {
            car = 'Nissan Vehicle';
        } else if (clean.startsWith('JH4')) {
            car = 'Honda Vehicle';
        }

        if (car) {
            res.json({ make: car.split(' ')[0], model: car });
        } else {
            res.status(404).json({ error: 'Vehicle chassis not in instant lookup' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Decoding service unavailable' });
    }
});

export default router;
