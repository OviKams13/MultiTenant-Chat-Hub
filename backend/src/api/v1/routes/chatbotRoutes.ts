import { Router } from 'express';
import { ChatbotController } from '../controllers/ChatbotController';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

// Chatbot routes are fully private and reserved to authenticated ADMIN owners.
// Multi-tenant safety is enforced by requiring auth context before any controller logic runs.
// requireRole keeps authorization policy explicit and reusable for future restricted modules.
// Route shape follows standard CRUD semantics for chatbot lifecycle management.
const chatbotRoutes = Router();

chatbotRoutes.post('/', requireAuth, requireRole(['ADMIN']), ChatbotController.createChatbot);
chatbotRoutes.get('/', requireAuth, requireRole(['ADMIN']), ChatbotController.listChatbots);
chatbotRoutes.get('/:id', requireAuth, requireRole(['ADMIN']), ChatbotController.getChatbotById);
chatbotRoutes.patch('/:id', requireAuth, requireRole(['ADMIN']), ChatbotController.updateChatbot);
chatbotRoutes.delete('/:id', requireAuth, requireRole(['ADMIN']), ChatbotController.deleteChatbot);

export default chatbotRoutes;
