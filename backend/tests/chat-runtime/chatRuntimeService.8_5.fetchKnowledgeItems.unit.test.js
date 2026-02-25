const test = require('node:test');
const assert = require('node:assert/strict');

const { ChatRuntimeService } = require('../../src/api/v1/services/ChatRuntimeService');
const { ChatbotItemTagModel } = require('../../src/api/v1/models/ChatbotItemTagModel');
const { BbEntityModel } = require('../../src/api/v1/models/BbEntityModel');
const { BbContactModel } = require('../../src/api/v1/models/BbContactModel');
const { BbScheduleModel } = require('../../src/api/v1/models/BbScheduleModel');
const { BlockTypeModel } = require('../../src/api/v1/models/BlockTypeModel');

// withFetchMocks replaces model readers used by fetchKnowledgeItems so we can verify batch behavior without DB.
// The helper restores every patched function, which keeps tests isolated for future feature iterations.
async function withFetchMocks(mocks, run) {
  const original = {
    tagLinks: ChatbotItemTagModel.findAll,
    entities: BbEntityModel.findAll,
    contacts: BbContactModel.findAll,
    schedules: BbScheduleModel.findAll,
    blockTypes: BlockTypeModel.findAll
  };

  if (mocks.tagLinks) ChatbotItemTagModel.findAll = mocks.tagLinks;
  if (mocks.entities) BbEntityModel.findAll = mocks.entities;
  if (mocks.contacts) BbContactModel.findAll = mocks.contacts;
  if (mocks.schedules) BbScheduleModel.findAll = mocks.schedules;
  if (mocks.blockTypes) BlockTypeModel.findAll = mocks.blockTypes;

  try {
    await run();
  } finally {
    ChatbotItemTagModel.findAll = original.tagLinks;
    BbEntityModel.findAll = original.entities;
    BbContactModel.findAll = original.contacts;
    BbScheduleModel.findAll = original.schedules;
    BlockTypeModel.findAll = original.blockTypes;
  }
}

// makeRow gives plain objects a toJSON method similar to Sequelize instances used in runtime serialization.
function makeRow(payload) {
  return {
    ...payload,
    toJSON() {
      return { ...payload };
    }
  };
}

test('fetchKnowledgeItems should build CONTACT, SCHEDULE, and DYNAMIC knowledge items in one pass', async () => {
  await withFetchMocks(
    {
      tagLinks: async () => [
        { item: { item_id: 1, entity_id: 10 } },
        { item: { item_id: 2, entity_id: 20 } },
        { item: { item_id: 3, entity_id: 30 } }
      ],
      entities: async () => [
        makeRow({ entity_id: 10, entity_type: 'CONTACT', type_id: null, data: null, created_at: new Date('2026-01-01') }),
        makeRow({ entity_id: 20, entity_type: 'SCHEDULE', type_id: null, data: null, created_at: new Date('2026-01-02') }),
        makeRow({ entity_id: 30, entity_type: null, type_id: 77, data: { campus: 'North' }, created_at: new Date('2026-01-03') })
      ],
      contacts: async () => [makeRow({ entity_id: 10, org_name: 'Acme', phone: '123' })],
      schedules: async () => [
        makeRow({ entity_id: 20, day_of_week: 'MONDAY', open_time: '08:00:00', close_time: '18:00:00' }),
        makeRow({ entity_id: 20, day_of_week: 'TUESDAY', open_time: '08:00:00', close_time: '18:00:00' })
      ],
      blockTypes: async () => [makeRow({ type_id: 77, type_name: 'PROGRAM' })]
    },
    async () => {
      const result = await ChatRuntimeService.fetchKnowledgeItems(3, ['CONTACT', 'SCHEDULE']);
      assert.equal(result.length, 3);

      const contact = result.find((item) => item.kind === 'CONTACT');
      const schedule = result.find((item) => item.kind === 'SCHEDULE');
      const dynamic = result.find((item) => item.kind === 'DYNAMIC');

      assert.equal(contact.entityId, 10);
      assert.equal(schedule.schedules.length, 2);
      assert.equal(dynamic.typeId, 77);
      assert.equal(dynamic.typeName, 'PROGRAM');
      assert.deepEqual(dynamic.data, { campus: 'North' });
    }
  );
});

test('fetchKnowledgeItems should return [] and skip entity query when no item links match tags', async () => {
  await withFetchMocks(
    {
      tagLinks: async () => [],
      entities: async () => {
        assert.fail('BbEntityModel.findAll must not be called when no tag links exist');
      }
    },
    async () => {
      const result = await ChatRuntimeService.fetchKnowledgeItems(5, ['ADDRESS']);
      assert.deepEqual(result, []);
    }
  );
});

test('fetchKnowledgeItems should map a pure dynamic entity (entity_type null + type_id set)', async () => {
  await withFetchMocks(
    {
      tagLinks: async () => [{ item: { item_id: 11, entity_id: 99 } }],
      entities: async () => [
        makeRow({ entity_id: 99, entity_type: null, type_id: 501, data: { fee: '200' }, created_at: new Date('2026-01-10') })
      ],
      contacts: async () => [],
      schedules: async () => [],
      blockTypes: async () => [makeRow({ type_id: 501, type_name: 'TUITION' })]
    },
    async () => {
      const result = await ChatRuntimeService.fetchKnowledgeItems(7, ['TUITION']);
      assert.equal(result.length, 1);
      assert.equal(result[0].kind, 'DYNAMIC');
      assert.equal(result[0].typeId, 501);
      assert.equal(result[0].typeName, 'TUITION');
      assert.deepEqual(result[0].data, { fee: '200' });
    }
  );
});
