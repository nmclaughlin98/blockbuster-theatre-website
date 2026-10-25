import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('shows the showtime spinner without hiding the rest of ticket selection', async () => {
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
      selections: [selection],
      selection,
      date: '2026-10-25',
      calendarMinDate: '2026-10-25',
      calendarMaxDate: '2026-10-31',
      time: '',
      selectedShowtimeId: '',
      tickets: {},
      totalTickets: 0,
      showtimes: [],
      dates: [
        { isoDate: '2026-10-25' },
        { isoDate: '2026-10-26' },
      ],
      pricing: null,
      calendarAvailability: {
        '2026-10-25': { showtimesCount: 2, averageAvailableSeats: 60 },
        '2026-10-26': { showtimesCount: 0, averageAvailableSeats: null },
      },
      calendarAvailabilityLoading: false,
      calendarAvailabilityError: null,
      selectionLoading: false,
      selectionError: null,
      showtimeLoading: true,
      showtimeError: null,
      pricingLoading: false,
      pricingError: null,
      validation: null,
      validationLoading: false,
      onSelectionChange: () => {},
      onDateChange: () => {},
      onRetryCalendarAvailability: () => {},
      onTimeChange: () => {},
      onTicketChange: () => {},
      onContinue: () => {},
    }));

    assert.match(markup, /id="booking-movie"/);
    assert.match(markup, /id="booking-date"/);
    assert.match(markup, /value="Sun 25 Oct 2026"/);
    assert.match(markup, /booking-calendar-availability-dot--high/);
    assert.match(markup, /booking-calendar-availability-dot--medium/);
    assert.match(markup, /booking-calendar-availability-dot--low/);
    assert.match(markup, /class="showtime-chips"[^>]*>.*class="showtime-loading"[^>]*>.*class="loader"/);
    assert.match(markup, /Loading showtimes/);
    assert.doesNotMatch(markup, /movie-detail-loading/);
  } finally {
    await vite.close();
  }
});
