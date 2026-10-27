import { MOVIES_API_URL } from '../../../config.js';

export const CINEMA_SEAT_CAPACITY = 71;

async function requestJson(path, options = {}, expectedStatus) {
  const response = await fetch(`${MOVIES_API_URL}${path}`, options);
  let data;

  try {
    data = await response.json();
  } catch {
    if (response.ok) throw new Error('The booking service returned an invalid response.');
  }

  if (!response.ok || (expectedStatus && response.status !== expectedStatus)) {
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

export function getUpcomingScreeningDates() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
}

export function getBookingMovieId(selection) {
  if (selection?.type === 'movie') return selection.movieId;
  if (selection?.type === 'offer') return selection.featuredMovieId;
  throw new Error('Choose a film or special offer before booking seats.');
}

export function isShowtimeIdForDate(showtimeId, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false;
  const parsedDate = new Date(`${date}T00:00:00Z`);
  return typeof showtimeId === 'string'
    && /^\d{6}_\d{4}-\d{2}-\d{2}_\d{4}$/.test(showtimeId)
    && !Number.isNaN(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === date
    && showtimeId.slice(7, 17) === date;
}

export async function getBookedSeats(showtimeId, date, signal) {
  if (!isShowtimeIdForDate(showtimeId, date)) {
    throw new Error('The selected showtime ID does not match the screening date.');
  }

  const query = new URLSearchParams({ showtimeId, date });
  const data = await requestJson(`/api/v1/bookings/guest?${query.toString()}`, { signal });
  if (data.showtimeId !== showtimeId || data.date !== date) {
    throw new Error('The booking service returned seat availability for a different screening.');
  }
  if (!Array.isArray(data.bookedSeats) || data.bookedSeats.some((seat) => (
    typeof seat !== 'string' || !/^[A-G](?:[1-9]|1[01])$/.test(seat)
  ))) {
    throw new Error('The booking service returned an invalid booked seat list.');
  }
  return data.bookedSeats;
}

export function createGuestBookingPayload({
  showtimeId, date, seats, email, customerName, tickets, offerId,
}) {
  if (!isShowtimeIdForDate(showtimeId, date)) {
    throw new Error('Choose a valid screening with a showtime ID for the selected date.');
  }
  if (!Array.isArray(seats) || seats.length === 0 || seats.length > 10
    || new Set(seats).size !== seats.length
    || seats.some((seat) => typeof seat !== 'string' || !/^[A-G](?:[1-9]|1[01])$/.test(seat))) {
    throw new Error('Select between 1 and 10 unique valid seats before completing your booking.');
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new Error('Enter a valid email address before completing your booking.');
  }
  if (typeof customerName !== 'string' || !customerName.trim()) {
    throw new Error('Enter your name before completing your booking.');
  }
  if (!Array.isArray(tickets) || tickets.some((ticket) => (
    !ticket
    || typeof ticket.tierId !== 'string'
    || !Number.isInteger(ticket.quantity)
    || ticket.quantity < 1
  )) || tickets.reduce((total, ticket) => total + ticket.quantity, 0) !== seats.length) {
    throw new Error('Ticket quantities must match the number of selected seats.');
  }

  const payload = {
    showtimeId,
    date,
    seats: [...seats],
    email: email.trim(),
    customerName: customerName.trim(),
    tickets: tickets.map(({ tierId, quantity }) => ({ tierId, quantity })),
  };
  if (offerId != null) payload.offerId = offerId;
  return payload;
}

export async function createGuestBooking(payload) {
  const data = await requestJson('/api/v1/bookings/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, 201);
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || typeof data.bookingId !== 'string' || !data.bookingId
    || typeof data.bookingRef !== 'string' || !data.bookingRef
    || data.showtimeId !== payload.showtimeId
    || !isShowtimeIdForDate(data.showtimeId, payload.date)
    || typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)
    || data.date !== payload.date
    || typeof data.movieTitle !== 'string' || !data.movieTitle
    || !Array.isArray(data.seats) || data.seats.length !== payload.seats.length
    || new Set(data.seats).size !== data.seats.length
    || data.seats.some((seat) => (
      typeof seat !== 'string' || !/^[A-G](?:[1-9]|1[01])$/.test(seat)
    ))
    || data.seats.some((seat) => !payload.seats.includes(seat))
    || !Array.isArray(data.tickets) || data.tickets.some((ticket) => (
      !ticket
      || typeof ticket.tierId !== 'string'
      || !Number.isInteger(ticket.quantity)
      || ticket.quantity < 1
    ))
    || data.tickets.reduce((total, ticket) => total + ticket.quantity, 0) !== data.seats.length
    || typeof data.totalAmount !== 'number' || data.totalAmount < 0
    || !Number.isFinite(data.totalAmount)
    || typeof data.currency !== 'string' || !/^[A-Z]{3}$/.test(data.currency)
    || typeof data.customerEmail !== 'string' || !data.customerEmail
    || typeof data.confirmationEmailSent !== 'boolean'
    || (data.conversionToken != null && typeof data.conversionToken !== 'string')
    || (data.conversionTokenExpiresAt != null && typeof data.conversionTokenExpiresAt !== 'string')) {
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

export function getShowtimesForDate(schedule, date) {
  if (!schedule || typeof schedule !== 'object') return [];
  const slots = Array.isArray(schedule)
    ? schedule
    : Object.values(schedule).filter(Array.isArray).flat();

  return slots.filter((showtime) => (
    showtime?.date === date
    && isShowtimeIdForDate(showtime.showtimeId, date)
  ));
}

export function getSelectionShowtimes(selection, movieDetail, date) {
  const schedule = hasOfferShowtimeOverrides(selection)
    ? selection.overrideShowtimes
    : movieDetail?.showtimes;

  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) return null;
  return getShowtimesForDate(schedule, date);
}

export function getSelectionShowtimeDates(selection, movieDetail, dates) {
  return dates.filter(({ isoDate }) => (
    getSelectionShowtimes(selection, movieDetail, isoDate)?.length > 0
  ));
}

function withDate(path, date) {
  if (!date) return path;
  const query = new URLSearchParams({ date });
  return `${path}?${query.toString()}`;
}

export async function getFilmSelections(signal, date) {
  const data = await requestJson(withDate('/film-selections', date), { signal });
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

export async function getMovies(signal, date) {
  const movies = [];
  const seenTokens = new Set();
  let nextToken = null;

  do {
    const query = new URLSearchParams();
    if (nextToken) query.set('nextToken', nextToken);
    if (date) query.set('date', date);
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

export async function getMoviesForDate(date, signal) {
  const weekday = getWeekdayForDate(date);
  const movies = await getMovies(signal);
  const candidates = movies.filter((movie) => (
    movie?.visible !== false
    && movie?.isComingSoon !== true
    && movie?.movieId != null
    && (
      (Array.isArray(movie.showtimes?.[weekday]) && movie.showtimes[weekday].length > 0)
      || getShowtimesForDate(movie.showtimes, date).length > 0
    )
  ));

  const scheduledMovies = new Array(candidates.length);
  let nextCandidateIndex = 0;
  const loadNextCandidate = async () => {
    while (nextCandidateIndex < candidates.length) {
      const index = nextCandidateIndex;
      nextCandidateIndex += 1;
      const movie = candidates[index];
      const details = await getMovieDetail(movie.movieId, signal, date);
      scheduledMovies[index] = {
        ...movie,
        showtimes: { [date]: getShowtimesForDate(details.showtimes, date) },
      };
    }
  };
  const workerCount = Math.min(4, candidates.length);
  await Promise.all(Array.from({ length: workerCount }, () => loadNextCandidate()));

  return scheduledMovies;
}

export async function getBookingSelections(signal, date) {
  try {
    return { selections: await getFilmSelections(signal, date), error: null };
  } catch (selectionError) {
    if (signal?.aborted) throw selectionError;

    try {
      const movies = await getMovies(signal, date);
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

export async function getMovieDetail(movieId, signal, date) {
  const path = withDate(`/movies/${encodeURIComponent(movieId)}`, date);
  const data = await requestJson(path, { signal });
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The booking service returned invalid movie details.');
  }
  return data;
}

export async function getSelectionDateAvailability(selection, dates, signal) {
  const schedules = new Array(dates.length);
  let nextDateIndex = 0;
  const loadDateSchedule = async () => {
    while (nextDateIndex < dates.length) {
      const index = nextDateIndex;
      nextDateIndex += 1;
      const date = dates[index].isoDate;
      let dateSelection = selection;
      if (selection.type === 'offer') {
        const selections = await getFilmSelections(signal, date);
        dateSelection = selections.find((item) => selectionKey(item) === selectionKey(selection));
        if (!dateSelection) {
          schedules[index] = [];
          continue;
        }
      }
      const movieId = getMovieDetailIdForSelection(dateSelection);
      const movieDetail = movieId == null ? null : await getMovieDetail(movieId, signal, date);
      schedules[index] = getSelectionShowtimes(dateSelection, movieDetail, date) || [];
    }
  };

  await Promise.all(Array.from(
    { length: Math.min(4, dates.length) },
    () => loadDateSchedule(),
  ));

  const availability = Object.fromEntries(dates.map(({ isoDate }) => [
    isoDate,
    { showtimesCount: 0, averageAvailableSeats: null },
  ]));
  const screenings = schedules.flatMap((showtimes, dateIndex) => (
    showtimes.map((showtime) => ({ date: dates[dateIndex].isoDate, showtime }))
  ));
  let nextScreeningIndex = 0;
  const loadScreeningAvailability = async () => {
    while (nextScreeningIndex < screenings.length) {
      const index = nextScreeningIndex;
      nextScreeningIndex += 1;
      const { date, showtime } = screenings[index];
      const bookedSeats = await getBookedSeats(showtime.showtimeId, date, signal);
      const dateAvailability = availability[date];
      dateAvailability.showtimesCount += 1;
      dateAvailability.averageAvailableSeats += CINEMA_SEAT_CAPACITY - bookedSeats.length;
    }
  };

  await Promise.all(Array.from(
    { length: Math.min(4, screenings.length) },
    () => loadScreeningAvailability(),
  ));

  for (const dateAvailability of Object.values(availability)) {
    if (dateAvailability.showtimesCount) {
      dateAvailability.averageAvailableSeats /= dateAvailability.showtimesCount;
    }
  }
  return availability;
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
