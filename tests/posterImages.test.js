import assert from 'node:assert/strict';
import test from 'node:test';
import { getPosterSrc, getPosterSrcSet, getPosterUrl } from '../src/utils/posterImages.js';

const tmdbPoster = 'https://image.tmdb.org/t/p/original/poster.jpg';

test('uses reduced TMDB poster sizes on slow connections', () => {
  assert.equal(getPosterSrc(tmdbPoster, true), 'https://image.tmdb.org/t/p/w342/poster.jpg');
  assert.equal(
    getPosterSrcSet(tmdbPoster, true),
    'https://image.tmdb.org/t/p/w185/poster.jpg 185w, https://image.tmdb.org/t/p/w342/poster.jpg 342w',
  );
});

test('keeps the full poster size options on regular connections', () => {
  const srcSet = getPosterSrcSet(tmdbPoster, false);

  assert.equal(getPosterSrc(tmdbPoster, false), tmdbPoster);
  assert.ok(srcSet.includes('w185/poster.jpg 185w'));
  assert.ok(srcSet.includes('w1280/poster.jpg 1280w'));
});

test('leaves non-TMDB poster URLs unchanged and without a generated srcSet', () => {
  const posterUrl = 'https://cdn.example.com/poster.jpg';

  assert.equal(getPosterUrl(posterUrl, 'w342'), undefined);
  assert.equal(getPosterSrc(posterUrl, true), posterUrl);
  assert.equal(getPosterSrcSet(posterUrl, true), undefined);
});
