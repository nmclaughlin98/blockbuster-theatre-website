export function getFirstAvailableDate(dates, availability) {
  return dates.find(({ isoDate }) => availability?.[isoDate]?.length > 0)?.isoDate || '';
}

export function getSingleAvailableShowtime(showtimes, availableSeatsByShowtimeId) {
  if (!Array.isArray(showtimes) || showtimes.length !== 1) return null;

  const [showtime] = showtimes;
  return availableSeatsByShowtimeId?.[showtime.showtimeId] > 0 ? showtime : null;
}
