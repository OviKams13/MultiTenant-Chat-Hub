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
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      AuthRegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      AuthLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
      ChatbotCreateRequest: {
        type: 'object',
        required: ['domain', 'display_name'],
        properties: {
          domain: { type: 'string', maxLength: 255 },
          display_name: { type: 'string', maxLength: 100 },
        },
      },
      ChatbotUpdateRequest: {
        type: 'object',
        properties: {
          domain: { type: 'string', maxLength: 255 },
          display_name: { type: 'string', maxLength: 100 },
        },
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
            items: { type: 'string', maxLength: 100 },
          },
        },
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
          hours_text: { type: 'string', maxLength: 255 },
        },
      },
      ScheduleBlockRequest: {
        type: 'object',
        required: ['title', 'day_of_week', 'open_time', 'close_time'],
        properties: {
          title: { type: 'string', maxLength: 120 },
          day_of_week: {
            type: 'string',
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          },
          open_time: { type: 'string', example: '09:00' },
          close_time: { type: 'string', example: '17:00' },
          notes: { type: 'string' },
        },
      },
      ScheduleBlockUpdateRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 120 },
          day_of_week: {
            type: 'string',
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          },
          open_time: { type: 'string', example: '09:00' },
          close_time: { type: 'string', example: '17:00' },
          notes: { type: 'string' },
        },
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
                    type: {
                      type: 'string',
                      enum: ['string', 'number', 'boolean', 'date', 'select'],
                    },
                    required: { type: 'boolean' },
                    options: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      BlockTypeUpdateRequest: {
        type: 'object',
        properties: {
          type_name: { type: 'string', maxLength: 100 },
          description: { type: 'string', maxLength: 255 },
          schema_definition: { type: 'object' },
        },
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
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      ChatMessage: {
        type: 'object',
        required: ['role', 'content'],
        properties: {
          role: { type: 'string', enum: ['user', 'assistant'] },
          content: { type: 'string' },
        },
      },
      PublicChatRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          chatbotId: { type: 'integer', minimum: 1 },
          domain: {
            type: 'string',
            description: 'Resolution key only; not proof of caller identity.',
          },
          widgetKey: {
            type: 'string',
            description: 'Public widget identifier for tracing/rotation. Not a secret.',
          },
          message: { type: 'string' },
          history: {
            type: 'array',
            items: { $ref: '#/components/schemas/ChatMessage' },
          },
        },
        description:
          'v1 public runtime request contract. At least one of chatbotId or domain must be provided (enforced by runtime validation).',
      },
      SourceItem: {
        type: 'object',
        required: ['entity_id', 'entity_type', 'tags'],
        properties: {
          entity_id: { type: 'integer' },
          entity_type: { type: 'string', enum: ['CONTACT', 'SCHEDULE', 'DYNAMIC'] },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      PublicChatResponseData: {
        type: 'object',
        required: ['answer', 'sourceItems'],
        properties: {
          answer: { type: 'string' },
          sourceItems: {
            type: 'array',
            items: { $ref: '#/components/schemas/SourceItem' },
          },
        },
      },
      PublicRuntimeError: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: {
            type: 'string',
            enum: [
              'VALIDATION_ERROR',
              'CHATBOT_NOT_FOUND',
              'NO_RELEVANT_TAG',
              'LLM_UNAVAILABLE',
              'RATE_LIMIT_EXCEEDED',
              'INTERNAL_ERROR',
            ],
          },
          message: { type: 'string' },
          details: { nullable: true },
        },
      },
      PublicChatSuccessEnvelope: {
        type: 'object',
        required: ['success', 'data', 'error'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/PublicChatResponseData' },
          error: { type: 'null' },
        },
      },
      PublicChatErrorEnvelope: {
        type: 'object',
        required: ['success', 'data', 'error'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          data: { type: 'null' },
          error: { $ref: '#/components/schemas/PublicRuntimeError' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Chatbots', description: 'Chatbot management for admins' },
    { name: 'Tags', description: 'System and custom tags used for chatbot data blocks' },
    { name: 'StaticBlocks', description: 'Contact and schedule static blocks for each chatbot' },
    {
      name: 'Dynamic Block Types',
      description: 'Manage dynamic block type definitions per chatbot',
    },
    { name: 'Item Tags', description: 'Read and replace item-level tags for one chatbot item' },
    {
      name: 'Dynamic Block Instances',
      description: 'CRUD operations for chatbot dynamic block instances',
    },
    {
      name: 'Public Runtime',
      description:
        'Stable API v1 runtime surface consumed by public widget integrations. domain is resolution-only; Origin allowlist is the primary authorization control.',
    },
  ],
  paths: {
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new admin/owner account',
        requestBody: { required: true },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Validation error' },
          '409': { description: 'Email already used' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate an existing admin/owner',
        requestBody: { required: true },
        responses: {
          '200': { description: 'Authenticated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Profile loaded' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'User not found' },
        },
      },
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
          '500': { description: 'Server error' },
        },
      },
      get: {
        tags: ['Chatbots'],
        summary: 'List chatbots owned by the authenticated admin owner',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Chatbots list' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '500': { description: 'Server error' },
        },
      },
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
          '404': { description: 'Chatbot not found' },
        },
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
          '409': { description: 'Domain already in use' },
        },
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
          '404': { description: 'Chatbot not found' },
        },
      },
    },

    '/api/v1/chatbots/{chatbotId}/allowed-origins': {
      get: {
        tags: ['Chatbots'],
        summary: 'List allowed origins configured for one chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Allowed origins list returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
        },
      },
      post: {
        tags: ['Chatbots'],
        summary: 'Create one allowed origin for one chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true },
        responses: {
          '201': { description: 'Allowed origin created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
          '409': { description: 'Allowed origin already exists' },
        },
      },
    },

    '/api/v1/chatbots/{chatbotId}/allowed-origins/{allowedOriginId}': {
      delete: {
        tags: ['Chatbots'],
        summary: 'Delete one allowed origin from one chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'allowedOriginId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '204': { description: 'Allowed origin deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Allowed origin/chatbot not found' },
        },
      },
    },

    '/api/v1/chatbots/{chatbotId}/blocks/contact': {
      post: {
        tags: ['StaticBlocks'],
        summary: 'Create the unique contact block for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true },
        responses: {
          '201': { description: 'Contact block created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
          '409': { description: 'Contact already exists' },
          '500': { description: 'Server error' },
        },
      },
      get: {
        tags: ['StaticBlocks'],
        summary: 'Get the contact block for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Contact block returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot/contact not found' },
          '500': { description: 'Server error' },
        },
      },
      put: {
        tags: ['StaticBlocks'],
        summary: 'Update the contact block for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true },
        responses: {
          '200': { description: 'Contact block updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot/contact not found' },
          '500': { description: 'Server error' },
        },
      },
      delete: {
        tags: ['StaticBlocks'],
        summary: 'Delete the contact block for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '204': { description: 'Contact block deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot/contact not found' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/v1/chatbots/{chatbotId}/blocks/schedules': {
      post: {
        tags: ['StaticBlocks'],
        summary: 'Create one schedule block for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true },
        responses: {
          '201': { description: 'Schedule block created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
          '500': { description: 'Server error' },
        },
      },
      get: {
        tags: ['StaticBlocks'],
        summary: 'List all schedule blocks for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Schedule blocks returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/v1/chatbots/{chatbotId}/blocks/schedules/{entityId}': {
      put: {
        tags: ['StaticBlocks'],
        summary: 'Update one schedule block by entity id',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'entityId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true },
        responses: {
          '200': { description: 'Schedule block updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Schedule not found' },
          '500': { description: 'Server error' },
        },
      },
      delete: {
        tags: ['StaticBlocks'],
        summary: 'Delete one schedule block by entity id',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'entityId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '204': { description: 'Schedule block deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Schedule not found' },
          '500': { description: 'Server error' },
        },
      },
    },

    '/api/v1/chatbots/{chatbotId}/block-types': {
      post: {
        tags: ['Dynamic Block Types'],
        summary: 'Create a dynamic block type for one chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true },
        responses: {
          '201': { description: 'Block type created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
          '409': { description: 'Block type name already exists' },
          '500': { description: 'Server error' },
        },
      },
      get: {
        tags: ['Dynamic Block Types'],
        summary: 'List global + chatbot block types for a chatbot',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Block types list returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot not found' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/v1/chatbots/{chatbotId}/block-types/{typeId}': {
      get: {
        tags: ['Dynamic Block Types'],
        summary: 'Get one block type by id for a chatbot context',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'typeId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Block type detail returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Block type not found' },
          '500': { description: 'Server error' },
        },
      },
      put: {
        tags: ['Dynamic Block Types'],
        summary: 'Update one chatbot-owned dynamic block type',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'typeId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true },
        responses: {
          '200': { description: 'Block type updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Block type not found' },
          '409': { description: 'Block type conflict' },
          '500': { description: 'Server error' },
        },
      },
      delete: {
        tags: ['Dynamic Block Types'],
        summary: 'Delete one chatbot-owned dynamic block type',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'typeId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '204': { description: 'Block type deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Block type not found' },
          '409': { description: 'Block type in use' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/v1/chatbots/{chatbotId}/items/{itemId}/tags': {
      get: {
        tags: ['Item Tags'],
        summary: 'List all tags currently assigned to one chatbot item',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Item tags returned' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot or item not found' },
          '500': { description: 'Server error' },
        },
      },
      put: {
        tags: ['Item Tags'],
        summary: 'Replace all tags for one chatbot item',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true },
        responses: {
          '200': { description: 'Item tags updated' },
          '400': { description: 'Validation error or tag not found' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot or item not found' },
          '500': { description: 'Server error' },
        },
      },
    },

    '/api/v1/chatbots/{chatbotId}/blocks/dynamic/{typeId}': {
      post: {
        tags: ['Dynamic Block Instances'],
        summary: 'Create one dynamic block instance for a chatbot and type',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'typeId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true },
        responses: {
          '201': { description: 'Dynamic block instance created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot/type not found' },
          '500': { description: 'Server error' },
        },
      },
      get: {
        tags: ['Dynamic Block Instances'],
        summary: 'List dynamic block instances for one chatbot and type',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'typeId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Dynamic block instances returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Chatbot/type not found' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/v1/chatbots/{chatbotId}/blocks/dynamic/{typeId}/{entityId}': {
      get: {
        tags: ['Dynamic Block Instances'],
        summary: 'Get one dynamic block instance by entity id',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'typeId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'entityId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Dynamic block instance returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Instance not found' },
          '500': { description: 'Server error' },
        },
      },
      put: {
        tags: ['Dynamic Block Instances'],
        summary: 'Update one dynamic block instance by entity id',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'typeId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'entityId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true },
        responses: {
          '200': { description: 'Dynamic block instance updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Instance not found' },
          '500': { description: 'Server error' },
        },
      },
      delete: {
        tags: ['Dynamic Block Instances'],
        summary: 'Delete one dynamic block instance by entity id',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'chatbotId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'typeId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'entityId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '204': { description: 'Dynamic block instance deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Instance not found' },
          '500': { description: 'Server error' },
        },
      },
    },

    '/api/v1/public/chat': {
      post: {
        tags: ['Public Runtime'],
        summary: 'API v1 public chat runtime endpoint for widget integrations',
        description:
          'Stable v1 runtime contract. domain resolves chatbot only (not identity). Server verifies HTTP Origin against chatbot allowlist. widgetKey is optional/public for diagnostics and rotation.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PublicChatRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Runtime response generated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PublicChatSuccessEnvelope' },
              },
            },
          },
          '400': {
            description: 'Validation error or no relevant tag for user message',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PublicChatErrorEnvelope' },
                examples: {
                  validation: {
                    value: {
                      success: false,
                      data: null,
                      error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid chat runtime request body',
                      },
                    },
                  },
                  invalidWidgetKey: {
                    value: {
                      success: false,
                      data: null,
                      error: { code: 'INVALID_WIDGET_KEY', message: 'Invalid widgetKey format.' },
                    },
                  },
                  noRelevantTag: {
                    value: {
                      success: false,
                      data: null,
                      error: {
                        code: 'NO_RELEVANT_TAG',
                        message: 'No relevant tags for this question',
                      },
                    },
                  },
                },
              },
            },
          },
          '403': {
            description: 'Origin is missing/disallowed for resolved chatbot',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PublicChatErrorEnvelope' },
                examples: {
                  originNotAllowed: {
                    value: {
                      success: false,
                      data: null,
                      error: {
                        code: 'ORIGIN_NOT_ALLOWED',
                        message: 'Origin is not allowed for this chatbot.',
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Chatbot not found for provided domain/chatbotId',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PublicChatErrorEnvelope' },
                examples: {
                  chatbotNotFound: {
                    value: {
                      success: false,
                      data: null,
                      error: { code: 'CHATBOT_NOT_FOUND', message: 'Chatbot not found' },
                    },
                  },
                },
              },
            },
          },
          '429': {
            description: 'Public runtime rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PublicChatErrorEnvelope' },
                examples: {
                  rateLimited: {
                    value: {
                      success: false,
                      data: null,
                      error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: 'Too many chat requests, please retry in a moment.',
                      },
                    },
                  },
                },
              },
            },
          },
          '503': {
            description: 'LLM generation service temporarily unavailable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PublicChatErrorEnvelope' },
                examples: {
                  llmUnavailable: {
                    value: {
                      success: false,
                      data: null,
                      error: {
                        code: 'LLM_UNAVAILABLE',
                        message: 'The answer generation service is temporarily unavailable.',
                      },
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Unexpected internal runtime error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PublicChatErrorEnvelope' },
                examples: {
                  internalError: {
                    value: {
                      success: false,
                      data: null,
                      error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/v1/tags': {
      get: {
        tags: ['Tags'],
        summary: 'List system and custom tags for admin builder UI',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'category', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'is_system', in: 'query', required: false, schema: { type: 'boolean' } },
          { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Tag list returned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '500': { description: 'Server error' },
        },
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
          '500': { description: 'Server error' },
        },
      },
    },
  },
};
