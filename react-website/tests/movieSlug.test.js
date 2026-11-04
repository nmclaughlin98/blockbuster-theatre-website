import assert from 'node:assert/strict';
import test from 'node:test';
import { movieSlug } from '../src/components/movies/movieId.js';
import { resolveMovieId } from '../src/components/pages/detail/useMovieDetail.js';

test('prefers the supplied movie slug for public URLs', () => {
  assert.equal(movieSlug({ movieId: 1468683, slug: 'the-fall-guy', title: 'The Fall Guy' }), 'the-fall-guy');
});

test('creates a title slug when the API does not provide one', () => {
  assert.equal(movieSlug({ movieId: 1468683, title: 'The Fall Guy: 2024' }), 'the-fall-guy-2024');
});

test('falls back to the movie ID when neither a slug nor title is available', () => {
  assert.equal(movieSlug({ movieId: 1468683 }), '1468683');
});

test('resolves slugs from every page of the movie catalogue', async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    requestedUrls.push(url);
    if (url.searchParams.get('nextToken')) {
      return new Response(JSON.stringify({
        movies: [{ movieId: 603, title: 'Back to the Future' }],
        nextToken: null,
      }));
    }

    return new Response(JSON.stringify({
      movies: Array.from({ length: 50 }, (_, index) => ({
        movieId: index + 1,
        title: `Film ${index + 1}`,
      })),
      nextToken: 'next-page',
    }));
  };

  try {
    assert.equal(await resolveMovieId('back-to-the-future'), '603');
    assert.equal(requestedUrls.length, 2);
    assert.equal(requestedUrls[0].searchParams.has('nextToken'), false);
    assert.equal(requestedUrls[1].searchParams.get('nextToken'), 'next-page');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
