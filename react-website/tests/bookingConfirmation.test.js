import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { createServer } from 'vite';

test('confirms the backend booking reference and total when confirmation email failed', async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { BookingConfirmation } = await vite.ssrLoadModule(
      '/src/components/pages/booking/BookingConfirmation.jsx',
    );
    const markup = renderToStaticMarkup(createElement(BookingConfirmation, {
      movie: { title: 'Inception' },
      time: '12:15',
      screen: '5',
      customer: { email: 'customer@example.com' },
      bookingDetails: {
        bookingId: 'bk_990123',
        bookingRef: 'BBT-883214',
        showtimeId: '559924_2026-11-01_1215',
        date: '2026-11-01',
        movieTitle: 'Inception',
        seats: ['F11', 'D2', 'D1'],
        tickets: [{ tierId: 'adult', quantity: 2 }, { tierId: 'child', quantity: 1 }],
        totalAmount: 24,
        currency: 'GBP',
        customerEmail: 'customer@example.com',
        confirmationEmailSent: false,
      },
      onToast: () => {},
    }));

    assert.match(markup, /Your reservation succeeded, but we could not send the confirmation email/);
    assert.match(markup, /Sun 1 Nov 2026 - 12:15/);
    assert.match(markup, /£24\.00/);
    assert.match(markup, /REF: BBT-883214/);
    const expectedCode = renderToStaticMarkup(createElement(QRCodeSVG, {
      value: 'BBT-883214',
      size: 160,
      level: 'M',
      boostLevel: false,
      marginSize: 4,
      bgColor: '#ffffff',
      fgColor: '#0c0d12',
      role: 'img',
      'aria-label': 'QR code for booking reference BBT-883214',
    }));
    assert.ok(markup.includes(expectedCode));
    assert.doesNotMatch(markup, /REF: 559924_2026-11-01_1215/);
    assert.match(markup, /D1, D2, F11/);
    const { TicketQRCode } = await vite.ssrLoadModule('/src/components/shared/TicketQRCode/TicketQRCode.jsx');
    const customCode = renderToStaticMarkup(createElement(TicketQRCode, {
      bookingRef: 'BBT-736257', size: 96, className: 'custom-ticket-qr',
    }));
    assert.match(customCode, /class="[^"]*custom-ticket-qr/);
    assert.match(customCode, /height="96" width="96"/);
    assert.match(customCode, /REF: BBT-736257/);
  } finally {
    await vite.close();
  }
});
