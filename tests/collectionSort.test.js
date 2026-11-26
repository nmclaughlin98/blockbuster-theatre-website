import assert from 'node:assert/strict';
import test from 'node:test';
import { sortMoviesByReleaseDate } from '../src/components/pages/collections/collectionSort.js';

test('sorts collection movies by release date and keeps undated movies last', () => {
  const movies = [
    { title: 'Latest', releaseDate: '2024-03-10' },
    { title: 'Undated' },
    { title: 'Oldest', releaseDate: '2001-11-02' },
    { title: 'Same date, first', releaseDate: '2010-05-01' },
    { title: 'Same date, second', releaseDate: '2010-05-01' },
    { title: 'Invalid date', releaseDate: 'unknown' },
  ];

  const sorted = sortMoviesByReleaseDate(movies);

  assert.deepEqual(sorted.map((movie) => movie.title), [
    'Oldest',
    'Same date, first',
    'Same date, second',
    'Latest',
    'Undated',
    'Invalid date',
  ]);
  assert.deepEqual(movies.map((movie) => movie.title), [
    'Latest',
    'Undated',
    'Oldest',
    'Same date, first',
    'Same date, second',
    'Invalid date',
  ]);
});
