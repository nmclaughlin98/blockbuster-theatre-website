export function PageLoader({ label = 'Loading page' }) {
  return (
    <div className="movie-detail-loading">
      <span className="loader" role="status" aria-label={label} />
    </div>
  );
}
