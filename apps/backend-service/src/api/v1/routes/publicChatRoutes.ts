import { Router } from 'express';
import { ChatRuntimeController } from '../controllers/ChatRuntimeController';
import { publicChatRateLimiter } from '../middlewares/publicChatRateLimiter';
import { validateChatRuntimeRequest } from '../validations/chatRuntimeValidation';

// Public chat route exposes the stable v1 visitor-facing runtime entrypoint for widget and dashboard calls.
// The path is versioned under /api/v1; breaking contract changes must move to a future /api/v2 route.
// Rate limiting is mandatory here because this endpoint is intentionally unauthenticated.
// Validation runs before controller so service receives a normalized payload shape every time.
const publicChatRoutes = Router();

publicChatRoutes.post('/public/chat', publicChatRateLimiter, validateChatRuntimeRequest, ChatRuntimeController.handleChat);

export default publicChatRoutes;
