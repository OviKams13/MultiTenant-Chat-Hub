import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { ChatRuntimeErrorPayload } from '../interfaces/ChatRuntime';

// Global error handler guarantees the response format required by the project contract.
// Controllers forward all exceptions here through next(err) to keep transport logic thin and reusable.
// Known AppError instances preserve status code and semantic code for frontend-specific handling.
// Unknown errors are transformed into a generic 500 response without leaking internals.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // Known business/validation errors keep their exact code and status so chat runtime clients can branch safely.
  if (err instanceof AppError) {
    const errorPayload: ChatRuntimeErrorPayload = {
      code: err.code ?? 'APPLICATION_ERROR',
      message: err.message,
      ...(typeof err.details === 'undefined' ? {} : { details: err.details })
    };

    res.status(err.statusCode).json({
      success: false,
      data: null,
      error: errorPayload
    });
    return;
  }

  // Unexpected runtime failures still honor the global envelope and provide a stable machine-readable error code.
  res.status(500).json({
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred.'
    }
  });
}
