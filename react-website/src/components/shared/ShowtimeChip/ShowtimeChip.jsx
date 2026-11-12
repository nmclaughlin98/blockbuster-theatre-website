export function ShowtimeChip({
  time,
  screen,
  className,
  active = false,
  onClick,
  href,
  title,
  children,
}) {
  const chipClassName = ['showtime-chip', className, active && 'active']
    .filter(Boolean)
    .join(' ');
  const content = (
    <>
      <span className="time-chip-time">{time}</span>
      <span className="time-chip-screen">Screen {screen}</span>
    </>
  );

  if (href) {
    return (
      <a className={chipClassName} href={href} title={title}>
        {content}
        {children}
      </a>
    );
  }

  return (
    <button
      className={chipClassName}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
    >
      {content}
      {children}
    </button>
  );
}
