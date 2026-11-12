import { forwardRef } from 'react';

function ChevronIcon({ direction }) {
  return (
    <svg
      className={`directional-button__icon${direction === 'previous' ? ' directional-button__icon--previous' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const DirectionalButton = forwardRef(function DirectionalButton({
  as,
  href,
  to,
  direction = 'next',
  variant,
  className = '',
  iconOnly = false,
  children,
  type,
  ...props
}, ref) {
  const Component = as ?? (href != null || to != null ? 'a' : 'button');
  const normalizedDirection = direction === 'prev' || direction === 'previous'
    ? 'previous'
    : direction === 'next'
      ? 'next'
      : null;
  const componentProps = { ...props };

  if (Component === 'a') {
    if (href !== undefined || to !== undefined) componentProps.href = href ?? to;
  } else if (Component !== 'button') {
    if (href !== undefined) componentProps.href = href;
    if (to !== undefined) componentProps.to = to;
  }

  if (Component === 'button') {
    componentProps.type = type ?? 'button';
  } else if (type !== undefined) {
    componentProps.type = type;
  }

  const componentClassName = [
    'directional-button',
    normalizedDirection && `directional-button--${normalizedDirection}`,
    variant && `directional-button--${variant}`,
    iconOnly && 'directional-button--icon-only',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component {...componentProps} className={componentClassName} ref={ref}>
      {normalizedDirection === 'previous' && <ChevronIcon direction={normalizedDirection} />}
      {children}
      {normalizedDirection === 'next' && <ChevronIcon direction={normalizedDirection} />}
    </Component>
  );
});
