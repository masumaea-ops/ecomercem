
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger';

export const httpLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();
  
  // Log Request Start
  // logger.debug(`Incoming: ${req.method} ${req.originalUrl}`);

  // Hook into response finish to log duration and status
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
    
    // Filter out common bot noise from logs (WordPress scans, etc)
    const isBotNoise = /wp-login|xmlrpc|php|actuator|env|aws|\.git/.test(req.originalUrl);
    if (isBotNoise && res.statusCode === 404) {
        return; // Silently ignore bot 404s
    }

    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  });

  next();
};
