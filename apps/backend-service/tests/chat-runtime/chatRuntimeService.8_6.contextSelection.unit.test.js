const test = require('node:test');
const assert = require('node:assert/strict');

const { MAX_CONTEXT_ITEMS } = require('../../src/config/constants');
const { ChatRuntimeService } = require('../../src/api/v1/services/ChatRuntimeService');

// makeItem creates deterministic knowledge rows so sorting assertions are easy to read in each scenario.
// This mirrors runtime payloads built in Feature 8.5 while keeping tests independent from DB lookups.
function makeItem(kind, entityId, createdAt) {
  if (kind === 'CONTACT') {
    return { kind, entityId, createdAt: new Date(createdAt), contact: { org_name: `Org-${entityId}` } };
  }

  if (kind === 'SCHEDULE') {
    return { kind, entityId, createdAt: new Date(createdAt), schedules: [] };
  }

  return { kind, entityId, createdAt: new Date(createdAt), typeId: 900 + entityId, typeName: 'PROGRAM', data: {} };
}

// kinds extracts the kind order so tests can verify strict business-priority trimming behavior.
function kinds(rows) {
  return rows.map((item) => item.kind);
}

// This scenario validates the primary contract: CONTACT first, then SCHEDULE, then DYNAMIC with global trimming.
test('selectContextItems should enforce CONTACT > SCHEDULE > DYNAMIC and trim to MAX_CONTEXT_ITEMS', async () => {
  const allItems = [
    makeItem('DYNAMIC', 50, '2026-01-10T08:00:00.000Z'),
    makeItem('CONTACT', 11, '2026-01-01T08:00:00.000Z'),
    makeItem('SCHEDULE', 21, '2026-01-03T08:00:00.000Z'),
    makeItem('CONTACT', 10, '2026-01-02T08:00:00.000Z'),
    makeItem('SCHEDULE', 20, '2026-01-04T08:00:00.000Z'),
    makeItem('DYNAMIC', 51, '2026-01-09T08:00:00.000Z')
  ];

  const selected = ChatRuntimeService.selectContextItems(allItems);

  assert.equal(selected.length, Math.min(MAX_CONTEXT_ITEMS, allItems.length));
  assert.deepEqual(kinds(selected).slice(0, 4), ['CONTACT', 'CONTACT', 'SCHEDULE', 'SCHEDULE']);
});

// This reproduces the business rule where lower-priority dynamic content is sacrificed once the window is full.
test('selectContextItems should drop all DYNAMIC items when CONTACT + SCHEDULE already fill the window', async () => {
  const allItems = [
    makeItem('CONTACT', 1, '2026-01-10T10:00:00.000Z'),
    makeItem('CONTACT', 2, '2026-01-09T10:00:00.000Z'),
    makeItem('CONTACT', 3, '2026-01-08T10:00:00.000Z'),
    makeItem('SCHEDULE', 4, '2026-01-07T10:00:00.000Z'),
    makeItem('SCHEDULE', 5, '2026-01-06T10:00:00.000Z'),
    makeItem('DYNAMIC', 100, '2026-01-11T10:00:00.000Z'),
    makeItem('DYNAMIC', 101, '2026-01-05T10:00:00.000Z')
  ];

  const selected = ChatRuntimeService.selectContextItems(allItems);

  assert.equal(selected.length, MAX_CONTEXT_ITEMS);
  assert.equal(selected.some((item) => item.kind === 'DYNAMIC'), false);
});

// Tie-break determinism is critical so repeated requests produce stable context ordering for the LLM prompt.
test('selectContextItems should apply tie-break by entityId when kind and createdAt are equal', async () => {
  const timestamp = '2026-01-01T00:00:00.000Z';
  const allItems = [makeItem('DYNAMIC', 30, timestamp), makeItem('DYNAMIC', 10, timestamp), makeItem('DYNAMIC', 20, timestamp)];

  const selected = ChatRuntimeService.selectContextItems(allItems);

  assert.deepEqual(
    selected.map((item) => item.entityId),
    [10, 20, 30]
  );
});
