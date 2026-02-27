import { Router } from 'express';
import { ItemTagController } from '../controllers/ItemTagController';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

// Item tag routes expose admin-only operations to read and replace tags for one item.
// Mounting under /api/v1/chatbots keeps resource ownership scoped by chatbot context.
// requireAuth ensures JWT verification before any tenancy-sensitive DB lookup occurs.
// requireRole(['ADMIN']) guarantees only owners can mutate semantic tagging configuration.
const itemTagRoutes = Router();

itemTagRoutes.get('/:chatbotId/items', requireAuth, requireRole(['ADMIN']), ItemTagController.listChatbotItems);
itemTagRoutes.get('/:chatbotId/items/:itemId/tags', requireAuth, requireRole(['ADMIN']), ItemTagController.getItemTags);
itemTagRoutes.put('/:chatbotId/items/:itemId/tags', requireAuth, requireRole(['ADMIN']), ItemTagController.updateItemTags);

export default itemTagRoutes;
