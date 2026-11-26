import { Link } from 'react-router-dom';

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
      <Link className={chipClassName} to={href} title={title}>
        {content}
        {children}
      </Link>
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
