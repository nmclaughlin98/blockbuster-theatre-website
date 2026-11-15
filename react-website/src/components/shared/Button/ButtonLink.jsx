import { forwardRef } from 'react';
import styles from './Button.module.css';

/**
 * Link variant of Button for use with React Router <Link> or <a> elements.
 * Supports the same variant/shape/icon props as Button component.
 */
export const ButtonLink = forwardRef(function ButtonLink({
  as: Component = 'a',
  variant = 'primary',
  shape = 'rounded',
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  ...props
}, ref) {
  const classes = [
    styles.button,
    styles[`variant-${variant}`],
    styles[`shape-${shape}`],
    fullWidth && styles.fullWidth,
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component
      ref={ref}
      className={classes}
      {...props}
    >
      {leftIcon && <span className={styles.iconLeft}>{leftIcon}</span>}
      {children}
      {rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
    </Component>
  );
});

ButtonLink.displayName = 'ButtonLink';
