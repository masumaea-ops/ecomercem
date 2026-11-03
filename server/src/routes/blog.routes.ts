import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { BlogPost } from '../entities/BlogPost';
import { Subscriber } from '../entities/Subscriber';
import { EmailService } from '../services/emailService';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();

// Helper to get repositories safely
const getBlogRepo = () => AppDataSource.getRepository(BlogPost);
const getSubscriberRepo = () => AppDataSource.getRepository(Subscriber);

// Helper to notify subscribers
async function notifySubscribers(post: BlogPost, origin: string) {
    try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const subscriberRepo = getSubscriberRepo();
        const subscribers = await subscriberRepo.find({ where: { isActive: true } });
        
        logger.info(`[BLOG] Notifying ${subscribers.length} subscribers about new post: ${post.title}`);
        
        // Send emails in parallel batches to avoid blocking too long
        const emailPromises = subscribers.map(sub => 
            EmailService.sendEmail('NEW_BLOG_POST', {
                email: sub.email,
                title: post.title,
                excerpt: post.excerpt,
                image: post.image,
                id: post.id,
                origin
            })
        );
        
        await Promise.all(emailPromises);
    } catch (error: any) {
        logger.error('[BLOG] Subscriber Notification Failed:', error.message);
    }
}

// Schema
const blogSchema = z.object({
    title: z.string().min(5),
    excerpt: z.string().min(10),
    content: z.string().min(20),
    image: z.string().url(),
    category: z.string(),
    readTime: z.string(),
    relatedProductCategory: z.string()
});

// GET /api/blog/:id (Public - Single Post)
router.get('/:id', async (req, res) => {
    try {
        const blogRepo = getBlogRepo();
        const post = await blogRepo.findOneBy({ id: req.params.id as any });
        if (!post) return res.status(404).json({ error: 'Post not found' });
        
        const formatted = {
            ...post,
            date: post.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

// GET /api/blog (Public - List)
router.get('/', async (req, res) => {
    try {
        const blogRepo = getBlogRepo();
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 6; // Default 6 posts per page
        const skip = (page - 1) * limit;

        const [posts, total] = await blogRepo.findAndCount({
            where: { isPublished: true },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: skip
        });
        
        const formatted = posts.map(p => ({
            ...p,
            date: p.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        }));

        res.json({
            data: formatted,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// POST /api/blog (Admin)
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), validate(blogSchema), async (req, res) => {
    try {
        const blogRepo = getBlogRepo();
        const post = blogRepo.create(req.body as any) as unknown as BlogPost;
        await blogRepo.save(post);

        // Notify subscribers if published
        if (post.isPublished) {
            const origin = req.get('origin') || req.get('referer') || 'https://masuma.africa';
            notifySubscribers(post, origin).catch(err => logger.error('Notification Error:', err));
        }

        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// PUT /api/blog/:id (Admin)
router.put('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), validate(blogSchema.partial()), async (req, res) => {
    try {
        const blogRepo = getBlogRepo();
        const post = await blogRepo.findOneBy({ id: req.params.id as any });
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const wasPublished = post.isPublished;
        blogRepo.merge(post, req.body);
        await blogRepo.save(post);

        // Notify if it was just published
        if (!wasPublished && post.isPublished) {
            const origin = req.get('origin') || req.get('referer') || 'https://masuma.africa';
            notifySubscribers(post, origin).catch(err => logger.error('Notification Error:', err));
        }

        res.json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update post' });
    }
});

// DELETE /api/blog/:id (Admin)
router.delete('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const blogRepo = getBlogRepo();
        await blogRepo.delete(req.params.id as any);
        res.json({ message: 'Post deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

export default router;