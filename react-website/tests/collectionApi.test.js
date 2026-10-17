import assert from 'node:assert/strict';
import test from 'node:test';
import { getCollection, getCollections } from '../src/components/pages/collectionApi.js';

function mockFetch(handler) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

const collectionResponse = {
  collection: {
    collectionId: '8706524',
    name: 'Example Collection',
    description: 'A group of films.',
    posterUrl: '',
    backdropUrl: '',
    movieIds: ['22', '11'],
  },
  movies: [
    { movieId: 22, title: 'Second Film', poster: '' },
    { movieId: 11, title: 'First Film', poster: '' },
  ],
};

test('loads collection cards from the collection index in API order', async () => {
  const collections = [
    {
      collectionId: '12',
      name: 'First Collection',
      description: 'First description.',
      posterUrl: '',
      backdropUrl: '',
      movieCount: 3,
      lastUpdated: '2026-10-17T00:00:00.000Z',
    },
    {
      collectionId: '34',
      name: 'Second Collection',
      description: 'Second description.',
      posterUrl: 'https://example.test/poster.jpg',
      backdropUrl: 'https://example.test/backdrop.jpg',
      movieCount: 0,
    },
  ];
  let requestedUrl;
  const restoreFetch = mockFetch(async (url) => {
    requestedUrl = new URL(url);
    return new Response(JSON.stringify({ collections }));
  });

  try {
    assert.deepEqual(await getCollections(), collections);
    assert.equal(requestedUrl.pathname, '/collections');
  } finally {
    restoreFetch();
  }
});

test('rejects malformed collection index data and surfaces list API errors', async () => {
  const responses = [
    new Response(JSON.stringify({ collections: [{ collectionId: 'abc' }] })),
    new Response(JSON.stringify({
      collections: [{
        collectionId: '12',
        name: 'Missing count',
        description: '',
        posterUrl: '',
        backdropUrl: '',
      }],
    })),
    new Response(JSON.stringify({ message: 'Unable to retrieve collections.' }), { status: 500 }),
  ];
  const restoreFetch = mockFetch(async () => responses.shift());

  try {
    await assert.rejects(getCollections(), /invalid collection list/);
    await assert.rejects(getCollections(), /invalid collection list/);
    await assert.rejects(getCollections(), /Unable to retrieve collections/);
  } finally {
    restoreFetch();
  }
});

test('loads a collection by ID and preserves the movie order returned by the API', async () => {
  let requestedUrl;
  const restoreFetch = mockFetch(async (url) => {
    requestedUrl = new URL(url);
    return new Response(JSON.stringify(collectionResponse));
  });

  try {
    const result = await getCollection('8706524');
    assert.equal(requestedUrl.pathname, '/collections/8706524');
    assert.deepEqual(result, collectionResponse);
    assert.deepEqual(result.movies.map((movie) => movie.movieId), [22, 11]);
  } finally {
    restoreFetch();
  }
});

test('rejects non-numeric IDs without making a request', async () => {
  let requestCount = 0;
  const restoreFetch = mockFetch(async () => {
    requestCount += 1;
    return new Response('{}');
  });

  try {
    await assert.rejects(getCollection('not-an-id'), /numeric collection ID/);
    assert.equal(requestCount, 0);
  } finally {
    restoreFetch();
  }
});

test('surfaces API errors and rejects malformed collection data', async () => {
  const responses = [
    new Response(JSON.stringify({ message: 'TMDB list collection not found.' }), { status: 404 }),
    new Response(JSON.stringify({ collection: {}, movies: [] })),
  ];
  const restoreFetch = mockFetch(async () => responses.shift());

  try {
    await assert.rejects(getCollection('404'), /TMDB list collection not found/);
    await assert.rejects(getCollection('405'), /invalid collection data/);
  } finally {
    restoreFetch();
  }
});
