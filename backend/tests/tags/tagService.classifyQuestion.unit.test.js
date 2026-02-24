const test = require('node:test');
const assert = require('node:assert/strict');

const { TagService } = require('../../src/api/v1/services/TagService');
const { TagModel } = require('../../src/api/v1/models/TagModel');

// withMockedTags replaces TagModel.findAll so classification tests stay deterministic and DB-independent.
// It restores the original method automatically, keeping other tests isolated.
async function withMockedTags(rows, run) {
  const original = TagModel.findAll;
  TagModel.findAll = async () => rows;

  try {
    await run();
  } finally {
    TagModel.findAll = original;
  }
}

// buildTagRow mimics the minimum TagModel shape used by classifyQuestion.
// This helper keeps test cases readable when defining multiple synonyms fixtures.
function buildTagRow(tag_code, synonyms_json) {
  return {
    tag_code,
    synonyms_json
  };
}

test('TagService.classifyQuestion should match one tag from synonyms', async () => {
  await withMockedTags(
    [buildTagRow('ADDRESS', ['address', 'location']), buildTagRow('PHONE', ['phone', 'call'])],
    async () => {
      const result = await TagService.classifyQuestion('What is your location?');
      assert.deepEqual(result, ['ADDRESS']);
    }
  );
});

test('TagService.classifyQuestion should match multiple tags without duplicates', async () => {
  await withMockedTags(
    [buildTagRow('ADDRESS', ['address']), buildTagRow('PHONE', ['phone'])],
    async () => {
      const result = await TagService.classifyQuestion('Need your phone and address please');
      assert.equal(result.includes('ADDRESS'), true);
      assert.equal(result.includes('PHONE'), true);
      assert.equal(new Set(result).size, result.length);
    }
  );
});

test('TagService.classifyQuestion should return empty array when nothing matches', async () => {
  await withMockedTags([buildTagRow('HOURS', ['opening hours'])], async () => {
    const result = await TagService.classifyQuestion('Tell me about tuition fees');
    assert.deepEqual(result, []);
  });
});

test('TagService.classifyQuestion should be case-insensitive', async () => {
  await withMockedTags([buildTagRow('ADDRESS', ['adresse'])], async () => {
    const result = await TagService.classifyQuestion('ADRESSE ?');
    assert.deepEqual(result, ['ADDRESS']);
  });
});
