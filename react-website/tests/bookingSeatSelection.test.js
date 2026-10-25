import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('renders booked seats disabled and keeps selected seats distinct', async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { SeatSelection } = await vite.ssrLoadModule('/src/components/pages/booking/SeatSelection.jsx');
    const markup = renderToStaticMarkup(createElement(SeatSelection, {
      selectedSeats: ['A2'],
      totalTickets: 1,
      bookedSeats: ['B4'],
      bookedSeatsLoading: false,
      bookedSeatsError: null,
      onRetryBookedSeats: () => {},
      onToggleSeat: () => {},
      onBack: () => {},
      onContinue: () => {},
    }));
    const bookedButton = markup.match(/<button\b[^>]*aria-label="Seat B4, booked"[^>]*>/)?.[0];
    const selectedButton = markup.match(/<button\b[^>]*aria-label="Seat A2, selected"[^>]*>/)?.[0];

    assert.ok(bookedButton);
    assert.match(bookedButton, /\bdisabled=/);
    assert.ok(selectedButton);
    assert.doesNotMatch(selectedButton, /\bdisabled=/);
  } finally {
    await vite.close();
  }
});
