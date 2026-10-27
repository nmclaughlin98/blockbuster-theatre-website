import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('preserves selected seats while seat availability is loading', async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { SeatSelection } = await vite.ssrLoadModule('/src/components/pages/booking/SeatSelection.jsx');
    const markup = renderToStaticMarkup(createElement(SeatSelection, {
      initialData: {
        seats: ['A2'],
        tickets: { adult: 1 },
        showtime: { showtimeId: '559924_2026-11-01_1215', date: '2026-11-01' },
      },
      onBack: () => {},
      onNext: () => {},
      onToast: () => {},
    }));
    const selectedButton = markup.match(/<button\b[^>]*aria-label="Seat A2, selected"[^>]*>/)?.[0];

    assert.ok(selectedButton);
    assert.match(selectedButton, /\bdisabled=/);
    assert.match(markup, /Selected Seats: <strong>A2<\/strong>/);
  } finally {
    await vite.close();
  }
});
