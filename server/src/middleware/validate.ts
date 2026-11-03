import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema<any>) => 
  async (req: ExpressRequest, res: ExpressResponse, next: any) => {
    const request = req as any;
    const response = res as any;
    try {
      // FIX: Validate req.body directly matches the schema structure
      // IMPORTANT: Assign the parsed result back to req.body to ensure sanitized data is used
      request.body = await schema.parseAsync(request.body);
      
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('Validation Error:', JSON.stringify(error.issues));
        const detailedMessage = error.issues.map((e: any) => e.message).join('. ') || 'Validation Error';
        return response.status(400).json({
          error: detailedMessage,
          details: error.issues.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      return response.status(400).json({ error: 'Invalid input data' });
    }
  };