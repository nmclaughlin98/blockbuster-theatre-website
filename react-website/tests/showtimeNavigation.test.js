import assert from 'node:assert/strict';
import test from 'node:test';
import { createBookingHref } from '../src/components/pages/shared/showtimeNavigation.js';

test('booking links retain the exact screening date, time, and backend showtime ID', () => {
  const href = createBookingHref(
    './bookNow.html',
    'movie 42',
    '2026-11-01',
    {
      date: '2026-11-01',
      time: '12:15',
      showtimeId: '559924_2026-11-01_1215',
    },
  );
  const url = new URL(href, 'https://theatre.example/nowShowing.html');

  assert.equal(url.pathname, '/bookNow.html');
  assert.equal(url.searchParams.get('movie'), 'movie 42');
  assert.equal(url.searchParams.get('date'), '2026-11-01');
  assert.equal(url.searchParams.get('time'), '12:15');
  assert.equal(url.searchParams.get('showtimeId'), '559924_2026-11-01_1215');
  assert.equal(url.searchParams.has('day'), false);
});
