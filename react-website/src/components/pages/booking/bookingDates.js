export function getFirstAvailableDate(dates, availability) {
  return dates.find(({ isoDate }) => availability?.[isoDate]?.length > 0)?.isoDate || '';
}
