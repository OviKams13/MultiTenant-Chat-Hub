import { Router } from 'express';
import { StaticBlockController } from '../controllers/StaticBlockController';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

// Static block routes sit under /api/v1/chatbots to keep block data scoped per chatbot.
// Every endpoint requires authenticated ADMIN access because blocks are owner-managed content.
// Contact routes implement single-block semantics while schedule routes remain multi-record.
// Controller layer handles validation and delegates persistence/tenancy checks to service methods.
const staticBlockRoutes = Router();

staticBlockRoutes.post('/:chatbotId/blocks/contact', requireAuth, requireRole(['ADMIN']), StaticBlockController.createContact);
staticBlockRoutes.get('/:chatbotId/blocks/contact', requireAuth, requireRole(['ADMIN']), StaticBlockController.getContact);
staticBlockRoutes.put('/:chatbotId/blocks/contact', requireAuth, requireRole(['ADMIN']), StaticBlockController.updateContact);

staticBlockRoutes.post('/:chatbotId/blocks/schedules', requireAuth, requireRole(['ADMIN']), StaticBlockController.createSchedule);
staticBlockRoutes.get('/:chatbotId/blocks/schedules', requireAuth, requireRole(['ADMIN']), StaticBlockController.listSchedules);
staticBlockRoutes.put(
  '/:chatbotId/blocks/schedules/:entityId',
  requireAuth,
  requireRole(['ADMIN']),
  StaticBlockController.updateSchedule
);
staticBlockRoutes.delete(
  '/:chatbotId/blocks/schedules/:entityId',
  requireAuth,
  requireRole(['ADMIN']),
  StaticBlockController.deleteSchedule
);

export default staticBlockRoutes;
