import rateLimit, { Options } from 'express-rate-limit';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Custom memory/redis hybrid or resilient rate limiter generator
 */
function createLimiter(options: Partial<Options> & { windowMs: number; max: number; messageText: string }) {
  const { messageText, ...limiterOptions } = options;
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP ${req.ip} on ${req.originalUrl}`);
      res.status(429).json({
        error: 'Too Many Requests',
        message: messageText,
        retryAfterSeconds: Math.ceil(options.windowMs / 1000)
      });
    },
    ...limiterOptions
  });
}

/**
 * Strict Auth Limiter: 5 login attempts per 15 minutes
 */
export const authRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  messageText: 'Too many authentication attempts. Please try again in 15 minutes.'
});

/**
 * Password Reset Limiter: 3 requests per hour
 */
export const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  messageText: 'Too many password reset requests. Please check your inbox or try again in an hour.'
});

/**
 * Registration Limiter: 5 accounts per hour per IP
 */
export const registrationLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  messageText: 'Registration rate limit reached. Please try again later.'
});

/**
 * Payment & M-Pesa STK push Limiter: 10 transactions per minute per IP
 */
export const paymentRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  messageText: 'Payment processing limit reached. Please wait a minute before submitting another payment.'
});

/**
 * Upload Limiter: 10 file uploads per minute per IP
 */
export const uploadRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  messageText: 'File upload rate limit reached. Please wait before uploading more files.'
});

/**
 * General Public API Limiter: 120 requests per minute per IP
 */
export const generalApiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 120,
  messageText: 'Too many requests. Please slow down.'
});

/**
 * Admin / Staff Operations Limiter: 300 requests per minute
 */
export const adminRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 300,
  messageText: 'Admin request rate exceeded. Please wait a moment.'
});

/**
 * Search Limiter: 60 search queries per minute per IP to prevent CPU starvation
 */
export const searchRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  messageText: 'Search rate limit reached. Please slow down.'
});

/**
 * Autocomplete Limiter: 120 suggestion queries per minute per IP
 */
export const autocompleteRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 120,
  messageText: 'Search suggestion limit reached. Please slow down.'
});

/**
 * Review Submission Limiter: 5 reviews per hour per IP to prevent review spam
 */
export const reviewRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  messageText: 'Review submission limit reached. Please try again later.'
});

