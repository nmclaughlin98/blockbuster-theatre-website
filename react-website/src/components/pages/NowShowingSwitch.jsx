export function NowShowingSwitch({ current, onChange }) {
  return (
    <div
      className="now-showing-switch"
      data-current={current}
      role="group"
      aria-label="Now Showing content"
    >
      <button
        className={current === 'movies' ? 'active' : ''}
        type="button"
        aria-pressed={current === 'movies'}
        onClick={() => onChange('movies')}
      >
        Now Showing
      </button>
      <button
        className={current === 'collections' ? 'active' : ''}
        type="button"
        aria-pressed={current === 'collections'}
        onClick={() => onChange('collections')}
      >
        Collections
      </button>
    </div>
  );
}
