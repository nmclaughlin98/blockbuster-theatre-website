import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAdditionalCollections } from '../src/components/pages/collections/useAdditionalCollections.js';

function collectionResponse(collectionId, isActive) {
  return {
    collection: {
      collectionId,
      name: `Collection ${collectionId}`,
      description: '',
      posterUrl: '',
      backdropUrl: '',
      ...(isActive === undefined ? {} : { isActive }),
      movieIds: [],
    },
    movies: [],
  };
}

test('loads at most three active additional collections in configured order', async () => {
  const originalFetch = globalThis.fetch;
  const requestedIds = [];
  globalThis.fetch = async (url) => {
    const collectionId = new URL(url).pathname.split('/').at(-1);
    requestedIds.push(collectionId);
    const activeStates = {
      1: false,
      2: true,
      3: false,
      4: undefined,
      5: true,
      6: true,
    };
    return new Response(JSON.stringify(collectionResponse(
      collectionId,
      activeStates[collectionId],
    )));
  };

  try {
    const result = await loadAdditionalCollections(
      ['1', '2', '3', '4', '5', '6'],
      new AbortController().signal,
    );

    assert.deepEqual(result.collections.map(({ collectionId }) => collectionId), ['2', '4', '5']);
    assert.deepEqual(requestedIds, ['1', '2', '3', '4', '5', '6']);
    assert.equal(result.error, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('starts all additional collection requests before any response resolves', async () => {
  const originalFetch = globalThis.fetch;
  const requestedIds = [];
  const resolveRequests = new Map();
  globalThis.fetch = (url) => new Promise((resolve) => {
    const collectionId = new URL(url).pathname.split('/').at(-1);
    requestedIds.push(collectionId);
    resolveRequests.set(collectionId, resolve);
  });

  try {
    const pending = loadAdditionalCollections(
      ['8706566', '8706524'],
      new AbortController().signal,
    );
    assert.deepEqual(requestedIds, ['8706566', '8706524']);

    resolveRequests.get('8706524')(new Response(JSON.stringify(collectionResponse('8706524'))));
    resolveRequests.get('8706566')(new Response(JSON.stringify(collectionResponse('8706566'))));
    const result = await pending;

    assert.deepEqual(result.collections.map(({ collectionId }) => collectionId), ['8706566', '8706524']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
