import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('formats the screening date for display while accepting its ISO value', async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { PaymentStep } = await vite.ssrLoadModule(
      '/src/components/pages/booking/PaymentStep.jsx',
    );
    const markup = renderToStaticMarkup(createElement(PaymentStep, {
      onBack: () => {},
      onConfirm: () => {},
      isSubmitting: false,
      movieTitle: 'Inception',
      seats: ['F10'],
      totalAmount: 12,
      customer: { firstName: 'Niall', surname: 'McLaughlin', email: 'customer@example.com' },
      date: '2025-10-30',
      time: '11:00',
      screen: '5',
    }));

    assert.match(markup, /Thurs 30 Oct 2025 - 11:00/);
    assert.doesNotMatch(markup, /2025-10-30 at 11:00/);
  } finally {
    await vite.close();
  }
});
