import { Worker } from 'bullmq';
import { redis } from '../config/redis';
import { EmailService } from '../services/emailService';

export const startEmailWorker = () => {
    if (!redis) {
        console.log('⚠️ [WORKER] Redis unavailable. Email Worker not started.');
        return;
    }

    console.log('📧 [WORKER] Initializing Email Background Worker...');

    try {
        const emailWorker = new Worker('email-queue', async (job) => {
            console.log(`📥 [WORKER] Processing Job ${job.id} (Type: ${job.data.type})...`);
            try {
                const { type, data } = job.data;
                await EmailService.processDirectEmail(type, data);
                console.log(`✨ [WORKER] Job ${job.id} finished processing.`);
            } catch (err: any) {
                console.error(`🔥 [WORKER] Job ${job.id} logic error:`, err.message);
                throw err;
            }
        }, { 
            connection: redis as any,
            concurrency: 5,
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 1000 }
        });

        emailWorker.on('ready', () => {
            console.log('✅ [WORKER] Email Queue Worker is READY and listening.');
        });

        emailWorker.on('completed', (job) => {
            console.log(`✅ [WORKER] Job ${job.id} marked COMPLETED.`);
        });

        emailWorker.on('failed', (job, err) => {
            console.warn(`⚠️ [WORKER] Job ${job?.id} FAILED:`, err.message);
        });

        emailWorker.on('error', (err: any) => {
            // Gracefully handle connection issues so worker never crashes the main app
            if (err?.code === 'ECONNREFUSED' || err?.message?.includes('Connection is closed')) {
                // Silently swallow after warning
            } else {
                console.warn('⚠️ [WORKER] Queue Worker warning:', err?.message || err);
            }
        });
    } catch (err: any) {
        console.warn('⚠️ [WORKER] BullMQ Worker failed to initialize (Redis offline). Continuing in Sync mode.');
    }
};
