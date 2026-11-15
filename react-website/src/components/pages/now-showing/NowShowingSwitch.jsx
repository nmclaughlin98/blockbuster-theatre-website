import styles from './NowShowingSwitch.module.css';

export function NowShowingSwitch({ current, onChange }) {
  return (
    <div
      className={styles.switch}
      data-current={current}
      role="group"
      aria-label="Now Showing content"
    >
      <button
        className={`${styles.button} ${current === 'movies' ? styles.active : ''}`}
        type="button"
        aria-pressed={current === 'movies'}
        onClick={() => onChange('movies')}
      >
        Now Showing
      </button>
      <button
        className={`${styles.button} ${current === 'collections' ? styles.active : ''}`}
        type="button"
        aria-pressed={current === 'collections'}
        onClick={() => onChange('collections')}
      >
        Collections
      </button>
    </div>
  );
}
