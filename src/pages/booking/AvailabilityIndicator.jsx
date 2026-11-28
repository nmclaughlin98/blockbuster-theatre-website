const availabilityLevels = new Set(['high', 'medium', 'low']);

export function AvailabilityIndicator({ level, className = '' }) {
  if (!availabilityLevels.has(level)) return null;

  return (
    <span
      className={[
        'booking-availability-indicator',
        `booking-availability-indicator--${level}`,
        className,
      ].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  );
}
