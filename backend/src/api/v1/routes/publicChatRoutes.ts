import { Router } from 'express';
import { ChatRuntimeController } from '../controllers/ChatRuntimeController';
import { publicChatRateLimiter } from '../middlewares/publicChatRateLimiter';
import { validateChatRuntimeRequest } from '../validations/chatRuntimeValidation';

// Public chat route exposes one visitor-facing entrypoint for widget and dashboard runtime calls.
// The path is outside /chatbots to avoid collision with admin CRUD routes and ownership middleware.
// Rate limiting is mandatory here because this endpoint is intentionally unauthenticated.
// Validation runs before controller so service receives a normalized payload shape every time.
const publicChatRoutes = Router();

publicChatRoutes.post('/public/chat', publicChatRateLimiter, validateChatRuntimeRequest, ChatRuntimeController.handleChat);

export default publicChatRoutes;
