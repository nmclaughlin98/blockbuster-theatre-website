import { forwardRef } from 'react';
import styles from './Button.module.css';

/**
 * Unified button component supporting primary/secondary variants,
 * rounded/pill shapes, and optional leading/trailing icons.
 */
export const Button = forwardRef(function Button({
  variant = 'primary',
  shape = 'rounded',
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  disabled = false,
  type = 'button',
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
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={classes}
      {...props}
    >
      {leftIcon && <span className={styles.iconLeft}>{leftIcon}</span>}
      {children}
      {rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';
