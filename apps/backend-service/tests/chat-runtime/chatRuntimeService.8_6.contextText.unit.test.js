const test = require('node:test');
const assert = require('node:assert/strict');

const { ChatRuntimeService } = require('../../src/api/v1/services/ChatRuntimeService');

// buildSampleSelection returns one item per kind so context text formatting can be asserted end-to-end.
// The payload mirrors the selected context right before Feature 8.7 hands it to Gemini.
function buildSampleSelection() {
  return [
    {
      kind: 'CONTACT',
      entityId: 10,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      contact: { org_name: 'Acme', phone: '+243123' }
    },
    {
      kind: 'SCHEDULE',
      entityId: 20,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      schedules: [{ day_of_week: 'MONDAY', open_time: '08:00', close_time: '17:00' }]
    },
    {
      kind: 'DYNAMIC',
      entityId: 30,
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      typeId: 77,
      typeName: 'PROGRAM',
      data: { campus: 'North' }
    }
  ];
}

// Empty selection should still yield a deterministic header so downstream prompt assembly remains stable.
test('buildContextText should return a minimal header when selection is empty', async () => {
  const text = ChatRuntimeService.buildContextText([]);
  assert.equal(text, 'Chatbot knowledge context:');
});

// Mixed selection should expose clear section markers and key details for each knowledge kind.
test('buildContextText should include CONTACT, SCHEDULE, and DYNAMIC sections with identifiers', async () => {
  const text = ChatRuntimeService.buildContextText(buildSampleSelection());

  assert.equal(text.includes('CONTACT (entityId=10):'), true);
  assert.equal(text.includes('SCHEDULE (entityId=20):'), true);
  assert.equal(text.includes('DYNAMIC (entityId=30, type=PROGRAM):'), true);
  assert.equal(text.includes('day: MONDAY, open: 08:00, close: 17:00'), true);
});
