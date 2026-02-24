import rateLimit from 'express-rate-limit';

// Public chat endpoint is intentionally open, so baseline abuse protection is mandatory in v1.
// We scope this limiter only to /api/v1/public/chat to avoid affecting authenticated admin APIs.
// Returning the standard API envelope keeps frontend handling consistent with existing error semantics.
// Limits are conservative by default (20 req/min/IP) and can be tuned per deployment environment.
export const publicChatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      data: null,
      error: {
        message: 'Too many chat requests, please retry in a moment.',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    });
  }
});
