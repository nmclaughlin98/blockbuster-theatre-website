import { MOVIES_API_URL } from '../../config.js';

async function requestJson(path, options = {}) {
  const response = await fetch(`${MOVIES_API_URL}${path}`, options);
  let data;

  try {
    data = await response.json();
  } catch {
    if (response.ok) throw new Error('The booking service returned an invalid response.');
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Booking request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getWeekdayForDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Choose a valid screening date.');
  }
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error('Choose a valid screening date.');
  }
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parsedDate.getUTCDay()];
}

export function getBookingMovieId(selection) {
  if (selection?.type === 'movie') return selection.movieId;
  if (selection?.type === 'offer') return selection.featuredMovieId;
  throw new Error('Choose a film or special offer before booking seats.');
}

export async function getBookedSeats(movieId, date, day, time, signal) {
  if (movieId == null) throw new Error('The selected film does not have a valid movie ID.');
  if (!date || getWeekdayForDate(date) !== day) {
    throw new Error('The screening weekday does not match the selected date.');
  }
  if (!time) throw new Error('Choose a showtime to load booked seats.');

  const query = new URLSearchParams({ movieId, date, day, time });
  const data = await requestJson(`/bookings?${query.toString()}`, { signal });
  if (!Array.isArray(data.bookedSeats) || data.bookedSeats.some((seat) => (
    typeof seat !== 'string' || !/^[A-G](?:[1-9]|1[01])$/.test(seat)
  ))) {
    throw new Error('The booking service returned an invalid booked seat list.');
  }
  return data.bookedSeats;
}

export function createGuestBookingPayload({
  showtimeId, seats, email, customerName,
}) {
  if (typeof showtimeId !== 'string' || !showtimeId.trim()) {
    throw new Error('The selected showtime is missing its booking ID.');
  }
  if (!Array.isArray(seats) || seats.length === 0
    || new Set(seats).size !== seats.length
    || seats.some((seat) => typeof seat !== 'string' || !/^[A-G](?:[1-9]|1[01])$/.test(seat))) {
    throw new Error('Select valid seats before completing your booking.');
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new Error('Enter a valid email address before completing your booking.');
  }
  if (typeof customerName !== 'string' || !customerName.trim()) {
    throw new Error('Enter your name before completing your booking.');
  }
  return {
    showtimeId: showtimeId.trim(),
    seats: [...seats],
    email: email.trim(),
    customerName: customerName.trim(),
  };
}

export async function createGuestBooking(payload) {
  const data = await requestJson('/api/v1/bookings/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || typeof data.bookingId !== 'string' || !data.bookingId
    || typeof data.showtimeId !== 'string' || !data.showtimeId
    || typeof data.movieTitle !== 'string' || !data.movieTitle
    || !Array.isArray(data.seats) || data.seats.some((seat) => (
      typeof seat !== 'string' || !/^[A-G](?:[1-9]|1[01])$/.test(seat)
    ))
    || typeof data.totalAmount !== 'number' || data.totalAmount < 0
    || !Number.isFinite(data.totalAmount)
    || typeof data.currency !== 'string' || !/^[A-Z]{3}$/.test(data.currency)
    || typeof data.customerEmail !== 'string' || !data.customerEmail
    || (data.conversionToken != null && typeof data.conversionToken !== 'string')) {
    throw new Error('The booking service returned invalid guest booking details.');
  }
  return data;
}

export async function convertGuestAccount(conversionToken, password) {
  if (typeof conversionToken !== 'string' || !conversionToken.trim()) {
    throw new Error('The guest conversion token is missing.');
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Use a password with at least 8 characters.');
  }

  const data = await requestJson('/api/v1/auth/convert-guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversionToken, password }),
  });
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || typeof data.userId !== 'string'
    || typeof data.email !== 'string'
    || typeof data.accessToken !== 'string'
    || typeof data.refreshToken !== 'string') {
    throw new Error('The account service returned invalid account details.');
  }
  return data;
}

export function selectionKey(selection) {
  return `${selection.type}:${selection.id}`;
}

export function selectionDisplayLabel(selection) {
  if (selection.type !== 'offer') return selection.label;
  return `Special offer: ${selection.displayLabel ?? selection.label ?? selection.title}`;
}

export function selectionApiId(selection) {
  if (selection.type === 'movie') return selection.movieId;
  if (selection.type === 'offer') return selection.offerId;
  throw new Error('Unsupported film selection type.');
}

export function hasOfferShowtimeOverrides(selection) {
  const overrides = selection?.overrideShowtimes;
  return Boolean(
    selection?.type === 'offer'
    && overrides
    && typeof overrides === 'object'
    && !Array.isArray(overrides)
    && Object.keys(overrides).length > 0
  );
}

export function getMovieDetailIdForSelection(selection) {
  if (selection?.type === 'movie') return selection.movieId ?? null;
  if (selection?.type === 'offer' && !hasOfferShowtimeOverrides(selection)) {
    return selection.featuredMovieId ?? null;
  }
  return null;
}

export function getSelectionShowtimes(selection, movieDetail, day) {
  const schedule = hasOfferShowtimeOverrides(selection)
    ? selection.overrideShowtimes
    : movieDetail?.showtimes;

  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) return null;
  return Array.isArray(schedule[day]) ? schedule[day] : [];
}

export function getSelectionShowtimeDates(selection, movieDetail, dates) {
  return dates.filter(({ weekday }) => getSelectionShowtimes(selection, movieDetail, weekday)?.length > 0);
}

export async function getFilmSelections(signal) {
  const data = await requestJson('/film-selections', { signal });
  if (!Array.isArray(data.selections)) {
    throw new Error('The booking service returned an invalid film selection list.');
  }

  const selections = data.selections.map((selection) => {
    if (!selection || typeof selection !== 'object' || Array.isArray(selection)) return selection;
    if (selection.type === 'offer') {
      return { ...selection, id: selection.id ?? selection.offerId };
    }
    if (selection.type == null && selection.offerId != null) {
      return { ...selection, type: 'offer', id: selection.id ?? selection.offerId };
    }
    return selection;
  });

  const validSelections = selections.every((selection) => (
    selection
    && (selection.type === 'movie' || selection.type === 'offer')
    && selection.id != null
    && (selection.type === 'movie'
      ? selection.movieId != null && typeof selection.title === 'string' && typeof selection.label === 'string'
      : selection.offerId != null
        && selection.featuredMovieId != null
        && selection.pricingId != null
        && (typeof selection.displayLabel === 'string'
          || typeof selection.label === 'string'
          || typeof selection.title === 'string'))
  ));
  if (!validSelections) throw new Error('The booking service returned an invalid film selection.');
  return selections.filter((selection) => (
    selection.type !== 'movie' || selection.isComingSoon !== true
  ));
}

export async function getMovies(signal) {
  const movies = [];
  const seenTokens = new Set();
  let nextToken = null;

  do {
    const query = new URLSearchParams();
    if (nextToken) query.set('nextToken', nextToken);
    const suffix = query.size ? `?${query.toString()}` : '';
    const data = await requestJson(`/movies${suffix}`, { signal });
    if (!Array.isArray(data.movies)) {
      throw new Error('The booking service returned an invalid movie list.');
    }
    movies.push(...data.movies);

    if (data.nextToken == null) {
      nextToken = null;
      continue;
    }
    if (typeof data.nextToken !== 'string' || seenTokens.has(data.nextToken)) {
      throw new Error('The booking service returned an invalid movie pagination token.');
    }
    seenTokens.add(data.nextToken);
    nextToken = data.nextToken;
  } while (nextToken);

  return movies;
}

export async function getBookingSelections(signal) {
  try {
    return { selections: await getFilmSelections(signal), error: null };
  } catch (selectionError) {
    if (signal?.aborted) throw selectionError;

    try {
      const movies = await getMovies(signal);
      const selections = movies
        .filter((movie) => movie.visible !== false && movie.isComingSoon !== true && movie.movieId != null)
        .map((movie) => ({
          type: 'movie',
          id: String(movie.movieId),
          movieId: movie.movieId,
          title: movie.title,
          label: movie.title,
          ...(movie.slug ? { slug: movie.slug } : {}),
        }));

      return {
        selections,
        error: `Special offers could not be loaded. Showing available films only. ${selectionError.message}`,
      };
    } catch (movieError) {
      if (signal?.aborted) throw movieError;
      throw new Error(`Unable to load film selections or movies: ${movieError.message}`, { cause: movieError });
    }
  }
}

export async function getMovieDetail(movieId, signal) {
  const data = await requestJson(`/movies/${encodeURIComponent(movieId)}`, { signal });
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The booking service returned invalid movie details.');
  }
  return data;
}

export async function getTicketPricing(selection, day, time, signal) {
  const query = new URLSearchParams();
  query.set(selection.type === 'offer' ? 'offerId' : 'movieId', selectionApiId(selection));
  query.set('day', day);
  query.set('time', time);

  const data = await requestJson(`/ticket-pricing?${query.toString()}`, { signal });
  const ticketTiers = data.ticketTiers || data.pricing?.ticketTiers;
  if (!Array.isArray(ticketTiers)) {
    throw new Error('The booking service returned invalid ticket pricing.');
  }

  return { ...data, ticketTiers };
}

export function createCheckoutPayload(selection, day, time, tickets) {
  const selectedTickets = Object.entries(tickets)
    .filter(([, quantity]) => quantity > 0)
    .map(([tierId, quantity]) => ({ tierId, quantity }));

  return {
    [selection.type === 'offer' ? 'offerId' : 'movieId']: selectionApiId(selection),
    showtime: { day, time },
    tickets: selectedTickets,
  };
}

export async function validateCheckout(payload, signal) {
  const data = await requestJson('/checkout/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (typeof data.total !== 'number' || !Number.isFinite(data.total)) {
    throw new Error('The booking service returned an invalid checkout total.');
  }
  return data;
}
