// Swagger document fragment for Auth module in Feature 1.
// This object can be consumed by swagger-ui-express in a future docs endpoint.
// Schemas enforce the standardized { success, data, error } API envelope.
// bearerAuth security scheme is declared for protected route /api/v1/auth/me.
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
      }
    }
  },
  tags: [{ name: 'Auth', description: 'Authentication endpoints' }],
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
    }
  }
};
