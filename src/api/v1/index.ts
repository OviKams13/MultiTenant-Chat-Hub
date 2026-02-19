import { Router } from 'express';
import authRoutes from './routes/authRoutes';
import chatbotRoutes from './routes/chatbotRoutes';

// API v1 router groups all versioned modules and keeps entrypoint composition readable.
// Auth routes manage owner identity while chatbot routes manage tenant chatbot resources.
// Grouping modules here avoids route mounting duplication in src/index.ts over time.
// Prefixes remain explicit and stable for client integration: /api/v1/auth and /api/v1/chatbots.
const v1Router = Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/chatbots', chatbotRoutes);

export default v1Router;
