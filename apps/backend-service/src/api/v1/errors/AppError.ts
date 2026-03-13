// AppError standardizes business and validation errors across controllers and middleware.
// The auth module uses this class to differentiate known client errors from unknown server failures.
// Keeping code/status separate allows future i18n and front-end error mapping by machine-readable codes.
// This class is intentionally lightweight so every feature can throw it without framework coupling.
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code?: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
