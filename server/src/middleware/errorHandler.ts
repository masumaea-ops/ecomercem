
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

export const errorHandler = (err: any, req: any, res: any, next: NextFunction) => {
  // Handle Multer upload errors gracefully (e.g. file size exceeded, unexpected field)
  if (err.name === 'MulterError') {
    logger.warn(`Multer Error on ${req.method} ${req.originalUrl}: ${err.message} (${err.code})`);
    return res.status(400).json({
      status: 'error',
      error: `File upload error: ${err.message}`,
      message: err.message
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Sanitize body to remove sensitive data before logging
  const sanitizedBody = { ...req.body };
  const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'resetPasswordToken'];
  sensitiveFields.forEach(field => {
    if (sanitizedBody[field]) sanitizedBody[field] = '********';
  });

  // Log the error details
  logger.error(`Request Failed: ${req.method} ${req.originalUrl}`, {
    error: message,
    stack: err.stack,
    body: sanitizedBody
  });

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
