import assert from 'node:assert/strict';
import test from 'node:test';
import { movieSlug } from '../src/components/movies/movieId.js';

test('prefers the supplied movie slug for public URLs', () => {
  assert.equal(movieSlug({ movieId: 1468683, slug: 'the-fall-guy', title: 'The Fall Guy' }), 'the-fall-guy');
});

test('creates a title slug when the API does not provide one', () => {
  assert.equal(movieSlug({ movieId: 1468683, title: 'The Fall Guy: 2024' }), 'the-fall-guy-2024');
});

test('falls back to the movie ID when neither a slug nor title is available', () => {
  assert.equal(movieSlug({ movieId: 1468683 }), '1468683');
});
