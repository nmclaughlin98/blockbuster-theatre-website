import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCheckoutPayload,
  getBookingSelections,
  getFilmSelections,
  getMovieDetail,
  getMovieDetailIdForSelection,
  getMovies,
  getSelectionShowtimes,
  getTicketPricing,
  hasOfferShowtimeOverrides,
  selectionApiId,
  selectionDisplayLabel,
  selectionKey,
  validateCheckout,
} from '../src/components/pages/bookingApi.js';

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
    const result = await getBookingSelections();
    assert.equal(requestedUrls[0].pathname, '/film-selections');
    assert.equal(requestedUrls[1].pathname, '/movies');
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

test('uses non-empty offer overrides authoritatively without falling back on missing days', () => {
  const movieDetail = { showtimes: {
    Tuesday: [{ time: '11:00', screen: '1' }, { time: '19:00', screen: '2' }],
    Wednesday: [{ time: '15:00', screen: '3' }],
  } };
  const offerWithOverrides = { ...offer, overrideShowtimes: { Tuesday: [{ time: '13:00', screen: '4' }] } };

  assert.equal(hasOfferShowtimeOverrides(offerWithOverrides), true);
  assert.equal(getMovieDetailIdForSelection(offerWithOverrides), null);
  assert.deepEqual(getSelectionShowtimes(offerWithOverrides, movieDetail, 'Tuesday'), [{ time: '13:00', screen: '4' }]);
  assert.deepEqual(getSelectionShowtimes(offerWithOverrides, movieDetail, 'Wednesday'), []);
  assert.deepEqual(getSelectionShowtimes(offerWithOverrides, movieDetail, 'Monday'), []);
});

test('uses featured movie showtimes when an offer override is empty or missing', () => {
  const movieDetail = { showtimes: { Tuesday: [{ time: '11:00', screen: '1' }, { time: '19:00', screen: '2' }] } };
  const offerWithEmptyOverrides = { ...offer, overrideShowtimes: {} };
  const offerWithoutOverrides = { ...offer, overrideShowtimes: undefined };

  for (const selection of [offerWithEmptyOverrides, offerWithoutOverrides]) {
    assert.equal(hasOfferShowtimeOverrides(selection), false);
    assert.equal(getMovieDetailIdForSelection(selection), offer.featuredMovieId);
    assert.deepEqual(getSelectionShowtimes(selection, movieDetail, 'Tuesday'), [
      { time: '11:00', screen: '1' },
      { time: '19:00', screen: '2' },
    ]);
    assert.equal(getSelectionShowtimes(selection, null, 'Tuesday'), null);
  }
});

test('loads standard movie showtimes by movie ID', async () => {
  let requestedUrl;
  const restoreFetch = mockFetch(async (url) => {
    requestedUrl = new URL(url);
    return new Response(JSON.stringify({ showtimes: { Tuesday: [{ time: '11:00', screen: '1' }] } }));
  });
  try {
    const details = await getMovieDetail(movie.movieId);
    assert.equal(requestedUrl.pathname, `/movies/${movie.movieId}`);
    assert.deepEqual(details.showtimes.Tuesday, [{ time: '11:00', screen: '1' }]);
    assert.deepEqual(getSelectionShowtimes(movie, details, 'Tuesday'), [{ time: '11:00', screen: '1' }]);
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
