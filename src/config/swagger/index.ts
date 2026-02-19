// Swagger document fragment for Auth and Chatbots modules in API v1.
// This object can be consumed by swagger-ui-express in a future docs endpoint.
// Schemas enforce the standardized { success, data, error } API envelope.
// bearerAuth security scheme is reused for all protected chatbot management endpoints.
export const authSwaggerSpec = {
  openapi: '3.0.0',
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      AuthRegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 }
        }
      },
      AuthLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 }
        }
      },
      ChatbotCreateRequest: {
        type: 'object',
        required: ['domain', 'display_name'],
        properties: {
          domain: { type: 'string', maxLength: 255 },
          display_name: { type: 'string', maxLength: 100 }
        }
      },
      ChatbotUpdateRequest: {
        type: 'object',
        properties: {
          domain: { type: 'string', maxLength: 255 },
          display_name: { type: 'string', maxLength: 100 }
        }
      }
    }
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Chatbots', description: 'Chatbot management for admins' }
  ],
  paths: {
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new admin/owner account',
        requestBody: { required: true },
        responses: { '201': { description: 'Created' }, '400': { description: 'Validation error' }, '409': { description: 'Email already used' } }
      }
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate an existing admin/owner',
        requestBody: { required: true },
        responses: { '200': { description: 'Authenticated' }, '400': { description: 'Validation error' }, '401': { description: 'Invalid credentials' } }
      }
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Profile loaded' }, '401': { description: 'Unauthorized' }, '404': { description: 'User not found' } }
      }
    },
    '/api/v1/chatbots': {
      post: {
        tags: ['Chatbots'],
        summary: 'Create a chatbot for the authenticated admin owner',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true },
        responses: {
          '201': { description: 'Chatbot created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '409': { description: 'Domain already in use' },
          '500': { description: 'Server error' }
        }
      },
      get: {
        tags: ['Chatbots'],
        summary: 'List chatbots owned by the authenticated admin owner',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Chatbots list' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/api/v1/chatbots/{id}': {
      get: {
        tags: ['Chatbots'],
        summary: 'Get chatbot details for authenticated owner',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Chatbot detail' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' }
        }
      },
      patch: {
        tags: ['Chatbots'],
        summary: 'Update chatbot fields for authenticated owner',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true },
        responses: {
          '200': { description: 'Chatbot updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
          '409': { description: 'Domain already in use' }
        }
      },
      delete: {
        tags: ['Chatbots'],
        summary: 'Delete chatbot for authenticated owner',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '204': { description: 'Chatbot deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' }
        }
      }
    }
  }
};
