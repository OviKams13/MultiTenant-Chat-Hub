import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';

// Global error handler guarantees the response format required by the project contract.
// Auth controllers forward all exceptions here through next(err) to keep controllers thin.
// Known AppError instances preserve status code and semantic code for client-side handling.
// Unknown errors are transformed into a generic 500 response without leaking internals.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      data: null,
      error: {
        message: err.message,
        code: err.code,
        details: err.details
      }
    });
    return;
  }

  res.status(500).json({
    success: false,
    data: null,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    }
  });
}
