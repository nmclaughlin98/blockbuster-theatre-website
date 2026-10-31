const SKELETON_MOVIE_COUNT = 7;

function SkeletonMovieSection({ title }) {
  return (
    <section className="home-skeleton-section" aria-hidden="true">
      <div className="home-skeleton-section-header">
        <span className="home-skeleton home-skeleton-heading" />
        <span className="home-skeleton home-skeleton-link" />
      </div>
      <div className="home-skeleton-movies">
        {Array.from({ length: SKELETON_MOVIE_COUNT }, (_, index) => (
          <span className="home-skeleton home-skeleton-poster" key={`${title}-${index}`} />
        ))}
      </div>
    </section>
  );
}

export function HomeSkeleton() {
  return (
    <div className="home-skeleton-page" role="status" aria-label="Loading home page" aria-busy="true">
      <span className="visually-hidden">Loading home page</span>
      <div className="home-skeleton-hero" aria-hidden="true">
        <div className="home-skeleton-hero-caption">
          <span className="home-skeleton home-skeleton-title" />
          <span className="home-skeleton home-skeleton-tagline" />
          <div className="home-skeleton-hero-actions">
            <span className="home-skeleton home-skeleton-action" />
            <span className="home-skeleton home-skeleton-action home-skeleton-action-secondary" />
            <span className="home-skeleton home-skeleton-action home-skeleton-action-short" />
          </div>
        </div>
      </div>
      <SkeletonMovieSection title="what's on" />
      <SkeletonMovieSection title="top picks" />
    </div>
  );
}
