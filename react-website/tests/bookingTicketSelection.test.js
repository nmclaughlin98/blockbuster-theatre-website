import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import {
  getFirstAvailableDate,
  getSingleAvailableShowtime,
} from '../src/components/pages/booking/bookingDates.js';

test('finds the first available screening date', () => {
  const dates = [
    { isoDate: '2026-10-25' },
    { isoDate: '2026-10-26' },
    { isoDate: '2026-10-27' },
  ];

  assert.equal(getFirstAvailableDate(dates, {
    '2026-10-25': [],
    '2026-10-26': [{ showtimeId: 'showtime-1' }],
    '2026-10-27': [{ showtimeId: 'showtime-2' }],
  }), '2026-10-26');
  assert.equal(getFirstAvailableDate(dates, {
    '2026-10-25': [],
    '2026-10-26': [],
    '2026-10-27': [],
  }), '');
});

test('auto-selects only a single showtime with remaining seats', () => {
  const showtime = { showtimeId: 'showtime-1' };

  assert.equal(getSingleAvailableShowtime([showtime], { 'showtime-1': 3 }), showtime);
  assert.equal(getSingleAvailableShowtime([showtime], { 'showtime-1': 0 }), null);
  assert.equal(getSingleAvailableShowtime([showtime], {}), null);
  assert.equal(getSingleAvailableShowtime([showtime, { showtimeId: 'showtime-2' }], {
    'showtime-1': 3,
    'showtime-2': 4,
  }), null);
});

test('keeps ticket selection visible with a subtle button loading state', async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { TicketSelection } = await vite.ssrLoadModule(
      '/src/components/pages/booking/TicketSelection.jsx',
    );
    const selection = {
      type: 'movie',
      id: '123',
      movieId: '123',
      title: 'Inception',
      label: 'Inception',
    };
    const markup = renderToStaticMarkup(createElement(TicketSelection, {
      initialData: {
        selection,
        date: '2026-10-25',
        tickets: {},
      },
      onNext: () => {},
      onToast: () => {},
    }));

    assert.match(markup, /id="booking-movie"/);
    assert.match(markup, /id="booking-date"/);
    assert.match(markup, /value="Sun 25 Oct 2026"/);
    assert.match(markup, /class="showtime-chips"[^>]*aria-busy="true"/);
    assert.match(markup, /class="booking-button-spinner"/);
    const continueButton = markup.match(/<button[^>]*booking-continue-button[^>]*>/)?.[0];
    assert.ok(continueButton);
    assert.match(continueButton, /is-loading/);
    assert.match(continueButton, /disabled=""/);
    assert.match(continueButton, /aria-busy="true"/);
    assert.doesNotMatch(markup, /class="showtime-loading"/);
    assert.doesNotMatch(markup, /movie-detail-loading/);
  } finally {
    await vite.close();
  }
});

test('renders ticket card metadata and disables decrement at its minimum', async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { TicketTypeCard } = await vite.ssrLoadModule(
      '/src/components/pages/booking/TicketTypeCard/TicketTypeCard.jsx',
    );
    const markup = renderToStaticMarkup(createElement(TicketTypeCard, {
      id: 'adult',
      title: 'Standard Adult',
      price: 6.5,
      description: 'Off-peak adult admission',
      quantity: 0,
      max: 2,
      onIncrement: () => {},
      onDecrement: () => {},
    }));

    assert.match(markup, /<span[^>]*>£<\/span><span[^>]*>6<\/span><span[^>]*>\.50<\/span>/);
    assert.match(markup, /Off-peak adult admission/);
    const decrementButton = markup.match(/<button[^>]*aria-label="Decrease Standard Adult tickets"[^>]*>/)?.[0];
    const incrementButton = markup.match(/<button[^>]*aria-label="Increase Standard Adult tickets"[^>]*>/)?.[0];
    assert.ok(decrementButton);
    assert.match(decrementButton, /disabled=""/);
    assert.ok(incrementButton);
    assert.doesNotMatch(incrementButton, /disabled=""/);
  } finally {
    await vite.close();
  }
});
