import assert from 'node:assert/strict';
import test from 'node:test';
import { MOVIES_API_URL } from '../src/config.js';
import {
  createCheckoutPayload,
  createGuestBooking,
  createGuestBookingPayload,
  convertGuestAccount,
  getBookedSeats,
  getBookingSelections,
  getFilmSelections,
  getMovieDetail,
  getMovieDetailIdForSelection,
  getMoviesForDate,
  getSelectionShowtimeDates,
  getSelectionDateAvailability,
  getShowtimesForDate,
  getMovies,
  getSelectionShowtimes,
  getTicketPricing,
  getWeekdayForDate,
  hasOfferShowtimeOverrides,
  isShowtimeIdForDate,
  selectionApiId,
  selectionDisplayLabel,
  selectionKey,
  validateCheckout,
} from '../src/components/pages/shared/bookingApi.js';

const movie = {
  type: 'movie',
  id: 'catalog-movie-id',
  movieId: 'movie-42',
  title: 'Example Film',
  label: 'Example Film',
};
const offer = {
  type: 'offer',
  id: 'catalog-offer-id',
  offerId: 'offer-42',
  title: 'Family Deal',
  label: 'Family Deal',
  featuredMovieId: 'movie-42',
  pricingId: 'family-pricing',
};

function mockFetch(handler) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test('excludes coming-soon movies and keeps movie and offer identities distinct', async () => {
  const comingSoonMovie = {
    ...movie,
    id: 'catalog-coming-soon-id',
    movieId: 'movie-43',
    title: 'Coming Soon',
    label: 'Coming Soon',
    isComingSoon: true,
  };
  const restoreFetch = mockFetch(async () => new Response(JSON.stringify({ selections: [movie, comingSoonMovie, offer] })));
  try {
    const selections = await getFilmSelections();
    assert.deepEqual(selections, [movie, offer]);
    assert.notEqual(selectionKey(movie), selectionKey(offer));
    assert.equal(selectionKey(movie), 'movie:catalog-movie-id');
    assert.equal(selectionKey(offer), 'offer:catalog-offer-id');
    assert.equal(selectionDisplayLabel(movie), 'Example Film');
    assert.equal(selectionDisplayLabel(offer), 'Special offer: Family Deal');
  } finally {
    restoreFetch();
  }
});

test('loads offers using their DynamoDB attribute names', async () => {
  const dynamoOffer = {
    offerId: 'halloween-spooktacular',
    ctaLabel: 'Claim Offer',
    displayLabel: 'Halloween Spooktacular',
    featuredMovieId: '27850',
    isActive: true,
    priceDescription: '£2.50 with valid Student ID',
    pricingId: 'STANDARD_RATES',
    tagline: 'Through the month of October',
    title: 'Halloween Spooktacular',
  };
  const restoreFetch = mockFetch(async () => new Response(JSON.stringify({ selections: [dynamoOffer] })));

  try {
    const [selection] = await getFilmSelections();

    assert.equal(selection.type, 'offer');
    assert.equal(selection.id, dynamoOffer.offerId);
    assert.equal(selection.displayLabel, dynamoOffer.displayLabel);
    assert.equal(selection.ctaLabel, dynamoOffer.ctaLabel);
    assert.equal(selection.priceDescription, dynamoOffer.priceDescription);
    assert.equal(selection.tagline, dynamoOffer.tagline);
    assert.equal(selectionApiId(selection), dynamoOffer.offerId);
    assert.equal(selectionDisplayLabel(selection), 'Special offer: Halloween Spooktacular');
  } finally {
    restoreFetch();
  }
});

test('keeps booking movies available from the catalog when film selections are unavailable', async () => {
  const responses = [
    new Response(JSON.stringify({ message: 'Unable to retrieve film selections.' }), { status: 500 }),
    new Response(JSON.stringify({
      movies: [
        { movieId: 42, title: 'Available Film', visible: true, isComingSoon: false },
        { movieId: 43, title: 'Coming Soon', visible: true, isComingSoon: true },
      ],
    })),
  ];
  const requestedUrls = [];
  const restoreFetch = mockFetch(async (url) => {
    requestedUrls.push(new URL(url));
    return responses.shift();
  });
  try {
    const result = await getBookingSelections(undefined, '2026-11-01');
    assert.equal(requestedUrls[0].pathname, '/film-selections');
    assert.equal(requestedUrls[0].searchParams.get('date'), '2026-11-01');
    assert.equal(requestedUrls[1].pathname, '/movies');
    assert.equal(requestedUrls[1].searchParams.get('date'), '2026-11-01');
    assert.deepEqual(result.selections, [{
      type: 'movie',
      id: '42',
      movieId: 42,
      title: 'Available Film',
      label: 'Available Film',
    }]);
    assert.match(result.error, /Special offers could not be loaded/);
  } finally {
    restoreFetch();
  }
});

test('follows movie catalogue pagination tokens', async () => {
  const requestedUrls = [];
  const responses = [
    new Response(JSON.stringify({
      movies: Array.from({ length: 50 }, (_, index) => ({ movieId: index })),
      nextToken: 'next-page-token',
    })),
    new Response(JSON.stringify({ movies: [{ movieId: 50 }], nextToken: null })),
  ];
  const restoreFetch = mockFetch(async (url) => {
    requestedUrls.push(new URL(url));
    return responses.shift();
  });
  try {
    const movies = await getMovies();
    assert.equal(movies.length, 51);
    assert.equal(requestedUrls.length, 2);
    assert.equal(requestedUrls[0].searchParams.has('nextToken'), false);
    assert.equal(requestedUrls[1].searchParams.get('nextToken'), 'next-page-token');
  } finally {
    restoreFetch();
  }
});

test('loads the movie catalogue for the selected calendar date', async () => {
  let requestedUrl;
  const restoreFetch = mockFetch(async (url) => {
    requestedUrl = new URL(url);
    return new Response(JSON.stringify({ movies: [] }));
  });
  try {
    await getMovies(undefined, '2026-11-01');
    assert.equal(requestedUrl.pathname, '/movies');
    assert.equal(requestedUrl.searchParams.get('date'), '2026-11-01');
  } finally {
    restoreFetch();
  }
});

test('loads date-specific showtime IDs for movies shown in the selected timetable weekday', async () => {
  const requestedUrls = [];
  const date = '2026-10-26';
  const showtime = {
    date,
    showtimeId: '559924_2026-10-26_1930',
    time: '19:30',
    screen: '2',
  };
  const restoreFetch = mockFetch(async (url) => {
    const requestedUrl = new URL(url);
    requestedUrls.push(requestedUrl);
    if (requestedUrl.pathname === '/movies') {
      return new Response(JSON.stringify({
        movies: [{
          movieId: 'movie-42',
          title: 'Example Film',
          showtimes: { Monday: [{ time: '19:30', screen: '2' }] },
        }],
      }));
    }
    return new Response(JSON.stringify({ showtimes: { Monday: [showtime] } }));
  });

  try {
    const movies = await getMoviesForDate(date);
    assert.equal(movies.length, 1);
    assert.equal(requestedUrls.length, 2);
    assert.equal(requestedUrls[1].pathname, '/movies/movie-42');
    assert.equal(requestedUrls[1].searchParams.get('date'), date);
    assert.deepEqual(movies[0].showtimes, { [date]: [showtime] });
  } finally {
    restoreFetch();
  }
});

test('loads booked seats by the exact showtime ID and selected date', async () => {
  const requestedUrls = [];
  const responses = [
    new Response(JSON.stringify({
      showtimeId: '559924_2026-10-26_1930',
      date: '2026-10-26',
      bookedSeats: ['B4', 'C2'],
    })),
    new Response(JSON.stringify({
      showtimeId: '559924_2026-10-27_1930',
      date: '2026-10-27',
      bookedSeats: [],
    })),
  ];
  const restoreFetch = mockFetch(async (url) => {
    requestedUrls.push(new URL(url));
    return responses.shift();
  });

  try {
    assert.equal(getWeekdayForDate('2026-10-26'), 'Monday');
    assert.deepEqual(await getBookedSeats('559924_2026-10-26_1930', '2026-10-26'), ['B4', 'C2']);
    assert.deepEqual(await getBookedSeats('559924_2026-10-27_1930', '2026-10-27'), []);
    assert.equal(requestedUrls[0].pathname, '/api/v1/bookings/guest');
    assert.deepEqual(Object.fromEntries(requestedUrls[0].searchParams), {
      showtimeId: '559924_2026-10-26_1930', date: '2026-10-26',
    });
    assert.equal(requestedUrls[0].search, '?showtimeId=559924_2026-10-26_1930&date=2026-10-26');
    assert.equal(requestedUrls[1].searchParams.get('date'), '2026-10-27');
    await assert.rejects(getBookedSeats('559924_2026-10-26_1930', '2026-10-27'), /does not match/);
  } finally {
    restoreFetch();
  }
});

test('rejects booked-seat data returned for another screening', async () => {
  const restoreFetch = mockFetch(async () => new Response(JSON.stringify({
    showtimeId: '559924_2026-11-02_1215',
    date: '2026-11-02',
    bookedSeats: [],
  })));
  try {
    await assert.rejects(
      getBookedSeats('559924_2026-11-01_1215', '2026-11-01'),
      /different screening/,
    );
  } finally {
    restoreFetch();
  }
});

test('accepts only the exact backend showtime ID format for its date', () => {
  assert.equal(isShowtimeIdForDate('559924_2026-11-01_1215', '2026-11-01'), true);
  assert.equal(isShowtimeIdForDate('559924_2026-11-01_1215', '2026-11-02'), false);
  assert.equal(isShowtimeIdForDate('show_2026-11-01_1215', '2026-11-01'), false);
  assert.equal(isShowtimeIdForDate('559924_2026-99-99_1215', '2026-99-99'), false);
});

test('selects backend showtimes by their exact date, not their schedule key', () => {
  const matchingShowtime = {
    date: '2026-11-01',
    showtimeId: '559924_2026-11-01_1215',
    time: '12:15',
    screen: '5',
  };
  const showtimes = {
    Sunday: [matchingShowtime, {
      date: '2026-11-08',
      showtimeId: '559924_2026-11-08_1215',
      time: '12:15',
      screen: '5',
    }],
    '2026-11-01': [{
      date: '2026-11-01',
      showtimeId: '559924_2026-11-01_1300',
      time: '13:00',
      screen: '2',
    }],
  };

  assert.deepEqual(getShowtimesForDate(showtimes, '2026-11-01'), [
    matchingShowtime,
    showtimes['2026-11-01'][0],
  ]);
});

test('posts the exact guest booking payload to the versioned endpoint', async () => {
  const bookingDetails = {
    bookingId: 'bk_990123',
    bookingRef: 'BBT-883214',
    showtimeId: '559924_2026-11-01_1215',
    date: '2026-11-01',
    movieTitle: 'Inception',
    seats: ['F10', 'F11'],
    tickets: [{ tierId: 'adult', quantity: 1 }, { tierId: 'child', quantity: 1 }],
    totalAmount: 24,
    currency: 'GBP',
    customerEmail: 'customer@example.com',
    conversionToken: 'cnv_tok_9918237491823',
    conversionTokenExpiresAt: '2026-11-01T12:15:00.000Z',
    confirmationEmailSent: false,
  };
  let request;
  const restoreFetch = mockFetch(async (url, options) => {
    request = { url: new URL(url), options };
    return new Response(JSON.stringify(bookingDetails), { status: 201 });
  });

  try {
    const payload = createGuestBookingPayload({
      showtimeId: '559924_2026-11-01_1215',
      date: '2026-11-01',
      seats: ['F10', 'F11'],
      email: ' customer@example.com ',
      customerName: ' Niall McLaughlin ',
      tickets: [{ tierId: 'adult', quantity: 1 }, { tierId: 'child', quantity: 1 }],
    });
    const booking = await createGuestBooking(payload);

    assert.equal(request.url.href, `${MOVIES_API_URL}/api/v1/bookings/guest`);
    assert.equal(request.url.pathname, '/api/v1/bookings/guest');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(request.options.body), {
      showtimeId: '559924_2026-11-01_1215',
      date: '2026-11-01',
      seats: ['F10', 'F11'],
      email: 'customer@example.com',
      customerName: 'Niall McLaughlin',
      tickets: [{ tierId: 'adult', quantity: 1 }, { tierId: 'child', quantity: 1 }],
    });
    assert.equal(JSON.parse(request.options.body).userId, undefined);
    assert.equal(JSON.parse(request.options.body).paymentToken, undefined);
    assert.deepEqual(booking, bookingDetails);
  } finally {
    restoreFetch();
  }
});

test('rejects an incomplete guest booking request before sending it', () => {
  assert.throws(() => createGuestBookingPayload({
    showtimeId: '559924_2026-11-01_1215',
    date: '2026-11-01',
    seats: ['F10', 'F11'],
    email: 'customer@example.com',
    customerName: 'Niall McLaughlin',
    tickets: [{ tierId: 'adult', quantity: 1 }],
  }), /Ticket quantities/);
});

test('includes an offer ID and verifies ticket quantities match selected seats', () => {
  const payload = createGuestBookingPayload({
    showtimeId: '559924_2026-11-01_1215',
    date: '2026-11-01',
    seats: ['F10'],
    email: 'customer@example.com',
    customerName: 'Niall McLaughlin',
    tickets: [{ tierId: 'offer-admission', quantity: 1 }],
    offerId: 'birthday-party-pack',
  });

  assert.deepEqual(payload, {
    showtimeId: '559924_2026-11-01_1215',
    date: '2026-11-01',
    seats: ['F10'],
    email: 'customer@example.com',
    customerName: 'Niall McLaughlin',
    tickets: [{ tierId: 'offer-admission', quantity: 1 }],
    offerId: 'birthday-party-pack',
  });
  assert.throws(() => createGuestBookingPayload({
    showtimeId: '559924_2026-11-01_1215',
    date: '2026-11-01',
    seats: ['F10', 'F11'],
    email: 'customer@example.com',
    customerName: 'Niall McLaughlin',
    tickets: [{ tierId: 'adult', quantity: 1 }],
  }), /Ticket quantities/);
});

test('preserves HTTP 409 status for a guest booking seat conflict', async () => {
  const restoreFetch = mockFetch(async () => new Response(
    JSON.stringify({ message: 'One or more seats are no longer available.' }),
    { status: 409 },
  ));

  try {
    await assert.rejects(createGuestBooking({ showtimeId: 'show_77812' }), (error) => {
      assert.equal(error.status, 409);
      assert.match(error.message, /no longer available/);
      return true;
    });
  } finally {
    restoreFetch();
  }
});

test('converts a guest using only the conversion token and password', async () => {
  let request;
  const restoreFetch = mockFetch(async (url, options) => {
    request = { url: new URL(url), options };
    return new Response(JSON.stringify({
      userId: 'usr_01HJ789',
      email: 'customer@example.com',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    }), { status: 200 });
  });

  try {
    const account = await convertGuestAccount('cnv_tok_9918237491823', 'AValidPassword123!');

    assert.equal(request.url.pathname, '/api/v1/auth/convert-guest');
    assert.equal(request.options.method, 'POST');
    assert.deepEqual(JSON.parse(request.options.body), {
      conversionToken: 'cnv_tok_9918237491823',
      password: 'AValidPassword123!',
    });
    assert.equal(account.userId, 'usr_01HJ789');
  } finally {
    restoreFetch();
  }
});

test('uses non-empty offer overrides authoritatively without falling back on missing dates', () => {
  const movieDetail = { showtimes: {
    '2026-10-27': [{
      date: '2026-10-27', showtimeId: '559924_2026-10-27_1100', time: '11:00', screen: '1',
    }],
    '2026-10-28': [{
      date: '2026-10-28', showtimeId: '559924_2026-10-28_1500', time: '15:00', screen: '3',
    }],
  } };
  const offerWithOverrides = {
    ...offer,
    overrideShowtimes: {
      '2026-10-27': [{
        date: '2026-10-27', showtimeId: '999999_2026-10-27_1300', time: '13:00', screen: '4',
      }],
    },
  };

  assert.equal(hasOfferShowtimeOverrides(offerWithOverrides), true);
  assert.equal(getMovieDetailIdForSelection(offerWithOverrides), null);
  assert.deepEqual(
    getSelectionShowtimes(offerWithOverrides, movieDetail, '2026-10-27'),
    offerWithOverrides.overrideShowtimes['2026-10-27'],
  );
  assert.deepEqual(getSelectionShowtimes(offerWithOverrides, movieDetail, '2026-10-28'), []);
  assert.deepEqual(getSelectionShowtimes(offerWithOverrides, movieDetail, '2026-10-26'), []);
});

test('lists only dates with showtimes for the selected movie or offer', () => {
  const dates = [
    { label: 'Mon 26 Oct 2026', isoDate: '2026-10-26' },
    { label: 'Tue 27 Oct 2026', isoDate: '2026-10-27' },
    { label: 'Wed 28 Oct 2026', isoDate: '2026-10-28' },
  ];
  const movieDetail = {
    showtimes: {
      '2026-10-27': [{
        date: '2026-10-27', showtimeId: '559924_2026-10-27_1100', time: '11:00', screen: '1',
      }],
      '2026-10-28': [],
    },
  };
  const offerWithOverrides = {
    ...offer,
    overrideShowtimes: {
      '2026-10-28': [{
        date: '2026-10-28', showtimeId: '559924_2026-10-28_1500', time: '15:00', screen: '2',
      }],
    },
  };

  assert.deepEqual(getSelectionShowtimeDates(movie, movieDetail, dates), [dates[1]]);
  assert.deepEqual(getSelectionShowtimeDates(offerWithOverrides, movieDetail, dates), [dates[2]]);
  assert.deepEqual(getSelectionShowtimeDates(movie, null, dates), []);
});

test('uses featured movie showtimes when an offer override is empty or missing', () => {
  const movieDetail = { showtimes: { '2026-10-27': [
    { date: '2026-10-27', showtimeId: '559924_2026-10-27_1100', time: '11:00', screen: '1' },
    { date: '2026-10-27', showtimeId: '559924_2026-10-27_1900', time: '19:00', screen: '2' },
  ] } };
  const offerWithEmptyOverrides = { ...offer, overrideShowtimes: {} };
  const offerWithoutOverrides = { ...offer, overrideShowtimes: undefined };

  for (const selection of [offerWithEmptyOverrides, offerWithoutOverrides]) {
    assert.equal(hasOfferShowtimeOverrides(selection), false);
    assert.equal(getMovieDetailIdForSelection(selection), offer.featuredMovieId);
    assert.deepEqual(getSelectionShowtimes(selection, movieDetail, '2026-10-27'), [
      { date: '2026-10-27', showtimeId: '559924_2026-10-27_1100', time: '11:00', screen: '1' },
      { date: '2026-10-27', showtimeId: '559924_2026-10-27_1900', time: '19:00', screen: '2' },
    ]);
    assert.equal(getSelectionShowtimes(selection, null, '2026-10-27'), null);
  }
});

test('loads date-specific showings and averages available seats for calendar dates', async () => {
  const dates = [{ isoDate: '2026-10-25' }, { isoDate: '2026-10-26' }];
  const restoreFetch = mockFetch(async (input) => {
    const url = new URL(input);
    if (url.pathname === '/movies/movie-42') {
      const date = url.searchParams.get('date');
      const showtimes = date === '2026-10-25'
        ? [{
          showtimeId: '559924_2026-10-25_1215',
          date,
          time: '12:15',
          screen: '5',
        }]
        : [];
      return new Response(JSON.stringify({ showtimes: { [date]: showtimes } }));
    }
    if (url.pathname === '/api/v1/bookings/guest') {
      return new Response(JSON.stringify({
        showtimeId: url.searchParams.get('showtimeId'),
        date: url.searchParams.get('date'),
        bookedSeats: Array.from({ length: 60 }, (_, index) => (
          `${String.fromCharCode(65 + Math.floor(index / 10))}${(index % 10) + 1}`
        )),
      }));
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  try {
    const availability = await getSelectionDateAvailability(movie, dates);
    assert.deepEqual(availability, {
      '2026-10-25': { showtimesCount: 1, averageAvailableSeats: 11 },
      '2026-10-26': { showtimesCount: 0, averageAvailableSeats: null },
    });
  } finally {
    restoreFetch();
  }
});

test('loads offer showtimes for each calendar date before estimating availability', async () => {
  const dates = [{ isoDate: '2026-10-25' }, { isoDate: '2026-10-26' }];
  const requestedFilmSelectionDates = [];
  const restoreFetch = mockFetch(async (input) => {
    const url = new URL(input);
    if (url.pathname === '/film-selections') {
      const date = url.searchParams.get('date');
      requestedFilmSelectionDates.push(date);
      const overrideShowtimes = date === '2026-10-25'
        ? {
          [date]: [{
            showtimeId: '559924_2026-10-25_1215',
            date,
            time: '12:15',
            screen: '5',
          }],
        }
        : {};
      return new Response(JSON.stringify({
        selections: [{ ...offer, overrideShowtimes }],
      }));
    }
    if (url.pathname === '/movies/movie-42') {
      const date = url.searchParams.get('date');
      return new Response(JSON.stringify({ showtimes: { [date]: [] } }));
    }
    if (url.pathname === '/api/v1/bookings/guest') {
      const date = url.searchParams.get('date');
      return new Response(JSON.stringify({
        showtimeId: url.searchParams.get('showtimeId'),
        date,
        bookedSeats: [],
      }));
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  try {
    const availability = await getSelectionDateAvailability(offer, dates);
    assert.deepEqual(requestedFilmSelectionDates.sort(), ['2026-10-25', '2026-10-26']);
    assert.deepEqual(availability, {
      '2026-10-25': { showtimesCount: 1, averageAvailableSeats: 71 },
      '2026-10-26': { showtimesCount: 0, averageAvailableSeats: null },
    });
  } finally {
    restoreFetch();
  }
});

test('loads standard movie showtimes by movie ID and selected date', async () => {
  let requestedUrl;
  const showtime = {
    date: '2026-11-01',
    showtimeId: '814077_2026-11-01_1215',
    time: '12:15',
    screen: '5',
  };
  const restoreFetch = mockFetch(async (url) => {
    requestedUrl = new URL(url);
    return new Response(JSON.stringify({ showtimes: { '2026-11-01': [showtime] } }));
  });
  try {
    const details = await getMovieDetail(movie.movieId, undefined, '2026-11-01');
    assert.equal(requestedUrl.pathname, `/movies/${movie.movieId}`);
    assert.equal(requestedUrl.searchParams.get('date'), '2026-11-01');
    assert.deepEqual(details.showtimes['2026-11-01'], [showtime]);
    assert.deepEqual(getSelectionShowtimes(movie, details, '2026-11-01'), [showtime]);
  } finally {
    restoreFetch();
  }
});

test('requests date-specific film selections', async () => {
  let requestedUrl;
  const restoreFetch = mockFetch(async (url) => {
    requestedUrl = new URL(url);
    return new Response(JSON.stringify({ selections: [movie] }));
  });
  try {
    await getFilmSelections(undefined, '2026-11-01');
    assert.equal(requestedUrl.pathname, '/film-selections');
    assert.equal(requestedUrl.searchParams.get('date'), '2026-11-01');
  } finally {
    restoreFetch();
  }
});
test('loads featured movie details for offers without override showtimes', async () => {
  let requestedUrl;
  const restoreFetch = mockFetch(async (url) => {
    requestedUrl = new URL(url);
    return new Response(JSON.stringify({ showtimes: { Tuesday: [{ time: '11:00', screen: '1' }] } }));
  });
  try {
    const movieId = getMovieDetailIdForSelection({ ...offer, overrideShowtimes: {} });
    await getMovieDetail(movieId);
    assert.equal(requestedUrl.pathname, `/movies/${offer.featuredMovieId}`);
  } finally {
    restoreFetch();
  }
});

test('surfaces missing featured movie details as a clear API error', async () => {
  const restoreFetch = mockFetch(async () => new Response(
    JSON.stringify({ message: 'Featured movie details are unavailable.' }),
    { status: 404 },
  ));
  try {
    await assert.rejects(
      getMovieDetail(getMovieDetailIdForSelection({ ...offer, overrideShowtimes: {} })),
      { message: 'Featured movie details are unavailable.' },
    );
  } finally {
    restoreFetch();
  }
});

test('requests pricing with exactly the selected type-specific ID and refreshes by showtime', async () => {
  const requestedUrls = [];
  const restoreFetch = mockFetch(async (url) => {
    requestedUrls.push(new URL(url));
    return new Response(JSON.stringify({
      pricing: { id: 'resolved-package' },
      ticketTiers: [{ id: 'adult', label: 'Adult', description: 'Standard', price: 12, currency: 'GBP' }],
    }));
  });
  try {
    await getTicketPricing(movie, 'Tuesday', '11:00');
    await getTicketPricing(offer, 'Tuesday', '11:00');
    await getTicketPricing(offer, 'Wednesday', '19:00');

    assert.equal(requestedUrls[0].searchParams.get('movieId'), 'movie-42');
    assert.equal(requestedUrls[0].searchParams.has('offerId'), false);
    assert.equal(requestedUrls[0].searchParams.has('screen'), false);
    assert.equal(requestedUrls[1].searchParams.get('offerId'), 'offer-42');
    assert.equal(requestedUrls[1].searchParams.has('movieId'), false);
    assert.equal(requestedUrls[1].searchParams.has('screen'), false);
    assert.equal(requestedUrls[2].searchParams.get('day'), 'Wednesday');
    assert.equal(requestedUrls[2].searchParams.get('time'), '19:00');
    assert.equal(requestedUrls[1].pathname, requestedUrls[2].pathname);
    assert.notEqual(requestedUrls[1].search, requestedUrls[2].search);
  } finally {
    restoreFetch();
  }
});

test('validates quantity changes without sending client prices and uses server totals', async () => {
  const requests = [];
  const restoreFetch = mockFetch(async (url, options) => {
    requests.push({ url: new URL(url), options, payload: JSON.parse(options.body) });
    const total = requests.at(-1).payload.tickets[0].quantity === 1 ? 12 : 24;
    return new Response(JSON.stringify({
      linePrices: [{ tierId: 'adult', quantity: requests.at(-1).payload.tickets[0].quantity, lineTotal: total }],
      total,
    }));
  });
  try {
    const oneTicket = createCheckoutPayload(movie, 'Tuesday', '11:00', { adult: 1 });
    const twoTickets = createCheckoutPayload(movie, 'Tuesday', '11:00', { adult: 2 });
    const firstQuote = await validateCheckout(oneTicket);
    const secondQuote = await validateCheckout(twoTickets);

    assert.equal(requests[0].url.pathname, '/checkout/validate');
    assert.deepEqual(requests[0].payload, {
      movieId: 'movie-42',
      showtime: { day: 'Tuesday', time: '11:00' },
      tickets: [{ tierId: 'adult', quantity: 1 }],
    });
    assert.equal('price' in requests[0].payload.tickets[0], false);
    assert.equal(firstQuote.total, 12);
    assert.equal(secondQuote.total, 24);
    assert.equal(requests[1].payload.tickets[0].quantity, 2);

    const offerPayload = createCheckoutPayload(offer, 'Tuesday', '11:00', { child: 2 });
    assert.deepEqual(offerPayload, {
      offerId: 'offer-42',
      showtime: { day: 'Tuesday', time: '11:00' },
      tickets: [{ tierId: 'child', quantity: 2 }],
    });
  } finally {
    restoreFetch();
  }
});

test('surfaces the backend message when checkout validation fails', async () => {
  const restoreFetch = mockFetch(async () => new Response(
    JSON.stringify({ message: 'This offer is no longer available.' }),
    { status: 409 },
  ));
  try {
    await assert.rejects(
      validateCheckout(createCheckoutPayload(offer, 'Tuesday', '11:00', { child: 1 })),
      { message: 'This offer is no longer available.' },
    );
  } finally {
    restoreFetch();
  }
});

test('rejects malformed film selection records instead of silently hiding them', async () => {
  const restoreFetch = mockFetch(async () => new Response(JSON.stringify({
    selections: [{ type: 'offer', id: 'offer-record', label: 'Family Deal' }],
  })));
  try {
    await assert.rejects(
      getFilmSelections(),
      { message: 'The booking service returned an invalid film selection.' },
    );
  } finally {
    restoreFetch();
  }
});

test('stops if movie pagination repeats a continuation token', async () => {
  let requestCount = 0;
  const restoreFetch = mockFetch(async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ movies: [], nextToken: 'repeated-token' }));
  });
  try {
    await assert.rejects(
      getMovies(),
      { message: 'The booking service returned an invalid movie pagination token.' },
    );
    assert.equal(requestCount, 2);
  } finally {
    restoreFetch();
  }
});

test('omits zero-quantity tiers from checkout payloads', () => {
  assert.deepEqual(
    createCheckoutPayload(offer, 'Tuesday', '11:00', { child: 2, adult: 0 }),
    {
      offerId: 'offer-42',
      showtime: { day: 'Tuesday', time: '11:00' },
      tickets: [{ tierId: 'child', quantity: 2 }],
    },
  );
});
