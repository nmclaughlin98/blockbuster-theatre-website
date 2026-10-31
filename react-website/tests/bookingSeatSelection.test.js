import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('preserves selected seats while loading and reports the selection count', async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { SeatSelection } = await vite.ssrLoadModule('/src/components/pages/booking/SeatSelection.jsx');
    const renderSeatSelection = (initialData) => renderToStaticMarkup(createElement(SeatSelection, {
      initialData,
      onBack: () => {},
      onNext: () => {},
      onToast: () => {},
    }));
    const markup = renderSeatSelection({
      seats: ['A2'],
      tickets: { adult: 1 },
      showtime: { showtimeId: '559924_2026-11-01_1215', date: '2026-11-01' },
    });
    const selectedButton = markup.match(/<button\b[^>]*aria-label="Seat A2, selected"[^>]*>/)?.[0];
    const remainingSeatMarkup = renderSeatSelection({
      seats: ['A2'],
      tickets: { adult: 2 },
    });
    const remainingSeatsMarkup = renderSeatSelection({
      seats: [],
      tickets: { adult: 3 },
    });
    const completePluralMarkup = renderSeatSelection({
      seats: ['A2', 'A3'],
      tickets: { adult: 2 },
    });

    assert.ok(selectedButton);
    assert.match(selectedButton, /\bdisabled=/);
    assert.match(markup, /Selected Seats: <strong>A2<\/strong>/);
    assert.match(markup, /seat-selection-status--complete[^>]*>✓ 1 of 1 seat selected/);
    assert.match(remainingSeatMarkup, /Please select 1 more seat/);
    assert.match(remainingSeatsMarkup, /Please select 3 more seats/);
    assert.match(completePluralMarkup, /✓ 2 of 2 seats selected/);
  } finally {
    await vite.close();
  }
});
