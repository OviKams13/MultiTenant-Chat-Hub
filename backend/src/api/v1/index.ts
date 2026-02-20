import { Router } from 'express';
import authRoutes from './routes/authRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import tagRoutes from './routes/tagRoutes';
import userBrowseRoutes from './routes/userBrowseRoutes';

// API v1 router groups all versioned modules and keeps entrypoint composition readable.
// Auth routes manage owner identity while chatbot routes manage tenant chatbot resources.
// Tag routes provide system/custom tag access for future static and dynamic block features.
// Prefixes remain explicit and stable for client integration across frontend modules.
const v1Router = Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/chatbots', chatbotRoutes);
v1Router.use('/tags', tagRoutes);
v1Router.use('/users', userBrowseRoutes);

export default v1Router;
