export function createBookingHref(basePath, movieIdentifier, date, showtime) {
  const params = new URLSearchParams({
    movie: String(movieIdentifier),
    date: showtime?.date || date,
  });

  if (showtime) {
    params.set('time', showtime.time);
    params.set('showtimeId', showtime.showtimeId);
  }

  return `${basePath}?${params.toString()}`;
}
