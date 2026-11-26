import styles from './SkeletonBlock.module.css';

export function SkeletonBlock({ className = '' }) {
  return (
    <span
      className={[styles.block, className].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  );
}
