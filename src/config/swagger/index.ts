// Swagger document fragment for Auth, Chatbots, Tags, Static Blocks, and Dynamic Block Types modules in API v1.
// This object can be consumed by swagger-ui-express in a future docs endpoint.
// Schemas enforce the standardized { success, data, error } API envelope.
// bearerAuth security scheme is reused for all protected chatbot, tags, static block, and block-type endpoints.
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
      },
      TagCreateRequest: {
        type: 'object',
        required: ['tag_code'],
        properties: {
          tag_code: { type: 'string', maxLength: 50 },
          description: { type: 'string', maxLength: 255 },
          category: { type: 'string', maxLength: 50 },
          synonyms: {
            type: 'array',
            items: { type: 'string', maxLength: 100 }
          }
        }
      },
      ContactBlockRequest: {
        type: 'object',
        required: ['org_name'],
        properties: {
          org_name: { type: 'string', maxLength: 120 },
          phone: { type: 'string', maxLength: 50 },
          email: { type: 'string', format: 'email', maxLength: 190 },
          address_text: { type: 'string', maxLength: 255 },
          city: { type: 'string', maxLength: 120 },
          country: { type: 'string', maxLength: 120 },
          hours_text: { type: 'string', maxLength: 255 }
        }
      },
      ScheduleBlockRequest: {
        type: 'object',
        required: ['title', 'day_of_week', 'open_time', 'close_time'],
        properties: {
          title: { type: 'string', maxLength: 120 },
          day_of_week: { type: 'string', enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
          open_time: { type: 'string', example: '09:00' },
          close_time: { type: 'string', example: '17:00' },
          notes: { type: 'string' }
        }
      },
      ScheduleBlockUpdateRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 120 },
          day_of_week: { type: 'string', enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
          open_time: { type: 'string', example: '09:00' },
          close_time: { type: 'string', example: '17:00' },
          notes: { type: 'string' }
        }
      },
      BlockTypeCreateRequest: {
        type: 'object',
        required: ['type_name', 'schema_definition'],
        properties: {
          type_name: { type: 'string', maxLength: 100 },
          description: { type: 'string', maxLength: 255 },
          schema_definition: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              fields: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['name', 'label', 'type'],
                  properties: {
                    name: { type: 'string', maxLength: 100 },
                    label: { type: 'string', maxLength: 120 },
                    type: { type: 'string', enum: ['string', 'number', 'boolean', 'date', 'select'] },
                    required: { type: 'boolean' },
                    options: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        }
      },
      BlockTypeUpdateRequest: {
        type: 'object',
        properties: {
          type_name: { type: 'string', maxLength: 100 },
          description: { type: 'string', maxLength: 255 },
          schema_definition: { type: 'object' }
        }
      },
      BlockTypeResponse: {
        type: 'object',
        properties: {
          type_id: { type: 'integer' },
          chatbot_id: { type: 'integer', nullable: true },
          type_name: { type: 'string' },
          description: { type: 'string', nullable: true },
          schema_definition: { type: 'object' },
          is_system: { type: 'boolean' },
          scope: { type: 'string', enum: ['GLOBAL', 'CHATBOT'] },
          created_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Chatbots', description: 'Chatbot management for admins' },
    { name: 'Tags', description: 'System and custom tags used for chatbot data blocks' },
    { name: 'StaticBlocks', description: 'Contact and schedule static blocks for each chatbot' },
    { name: 'Dynamic Block Types', description: 'Manage dynamic block type definitions per chatbot' }
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
    },

    '/api/v1/chatbots/{chatbotId}/blocks/contact': {
      post: {
        tags: ['StaticBlocks'],
        summary: 'Create the unique contact block for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true },
        responses: {
          '201': { description: 'Contact block created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
          '409': { description: 'Contact already exists' },
          '500': { description: 'Server error' }
        }
      },
      get: {
        tags: ['StaticBlocks'],
        summary: 'Get the contact block for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Contact block returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot/contact not found' },
          '500': { description: 'Server error' }
        }
      },
      put: {
        tags: ['StaticBlocks'],
        summary: 'Update the contact block for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true },
        responses: {
          '200': { description: 'Contact block updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot/contact not found' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/api/v1/chatbots/{chatbotId}/blocks/schedules': {
      post: {
        tags: ['StaticBlocks'],
        summary: 'Create one schedule block for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true },
        responses: {
          '201': { description: 'Schedule block created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
          '500': { description: 'Server error' }
        }
      },
      get: {
        tags: ['StaticBlocks'],
        summary: 'List all schedule blocks for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Schedule blocks returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/api/v1/chatbots/{chatbotId}/blocks/schedules/{entityId}': {
      put: {
        tags: ['StaticBlocks'],
        summary: 'Update one schedule block by entity id',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'entityId', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        requestBody: { required: true },
        responses: {
          '200': { description: 'Schedule block updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Schedule not found' },
          '500': { description: 'Server error' }
        }
      },
      delete: {
        tags: ['StaticBlocks'],
        summary: 'Delete one schedule block by entity id',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'entityId', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          '204': { description: 'Schedule block deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Schedule not found' },
          '500': { description: 'Server error' }
        }
      }
    },

    '/api/v1/chatbots/{chatbotId}/block-types': {
      post: {
        tags: ['Dynamic Block Types'],
        summary: 'Create a dynamic block type for one chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true },
        responses: {
          '201': { description: 'Block type created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
          '409': { description: 'Block type name already exists' },
          '500': { description: 'Server error' }
        }
      },
      get: {
        tags: ['Dynamic Block Types'],
        summary: 'List global + chatbot block types for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Block types list returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/api/v1/chatbots/{chatbotId}/block-types/{typeId}': {
      get: {
        tags: ['Dynamic Block Types'],
        summary: 'Get one block type by id for a chatbot context',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'typeId', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: 'Block type detail returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Block type not found' },
          '500': { description: 'Server error' }
        }
      },
      put: {
        tags: ['Dynamic Block Types'],
        summary: 'Update one chatbot-owned dynamic block type',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'typeId', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        requestBody: { required: true },
        responses: {
          '200': { description: 'Block type updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Block type not found' },
          '409': { description: 'Block type conflict' },
          '500': { description: 'Server error' }
        }
      },
      delete: {
        tags: ['Dynamic Block Types'],
        summary: 'Delete one chatbot-owned dynamic block type',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'typeId', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          '204': { description: 'Block type deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Block type not found' },
          '409': { description: 'Block type in use' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/api/v1/tags': {
      get: {
        tags: ['Tags'],
        summary: 'List system and custom tags for admin builder UI',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'category', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'is_system', in: 'query', required: false, schema: { type: 'boolean' } },
          { name: 'search', in: 'query', required: false, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Tag list returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '500': { description: 'Server error' }
        }
      },
      post: {
        tags: ['Tags'],
        summary: 'Create a custom non-system tag',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true },
        responses: {
          '201': { description: 'Tag created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '409': { description: 'Tag code already exists' },
          '500': { description: 'Server error' }
        }
      }
    }
  }
};
