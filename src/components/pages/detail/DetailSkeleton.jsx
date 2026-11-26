import { SkeletonBlock } from '../../shared/SkeletonBlock/SkeletonBlock';
import styles from '../shared/PageSkeletons.module.css';

export function DetailSkeleton({ comingSoon }) {
  return (
    <div role="status" aria-label="Loading movie details" aria-busy="true">
      <section className="movie-still" aria-hidden="true">
        <SkeletonBlock className={`still ${styles.detailHeroArtwork}`} />
        <div className="movie-detail-caption">
          <h1><SkeletonBlock className={styles.detailTitle} /></h1>
          <div className={`rating-container ${styles.ratingPlaceholder}`}>
            <SkeletonBlock className={styles.ratingBadge} />
            <SkeletonBlock className={styles.runtimePlaceholder} />
          </div>
          <div className="movie-detail-meta">
            <p><SkeletonBlock className={`${styles.detailMetadataLine} ${styles.detailMetadataDirector}`} /></p>
            <p><SkeletonBlock className={`${styles.detailMetadataLine} ${styles.detailMetadataCast}`} /></p>
            <p><SkeletonBlock className={`${styles.detailMetadataLine} ${styles.detailMetadataRelease}`} /></p>
          </div>
        </div>
      </section>
      <section className="movie-page" aria-hidden="true">
        <div className="col-no-border col-2-3">
          <h2><SkeletonBlock className={styles.detailSubheading} /></h2>
          <div id="movie-synopsis" className={styles.synopsisLines}>
            <SkeletonBlock className={styles.synopsisLine} />
            <SkeletonBlock className={`${styles.synopsisLine} ${styles.synopsisLineShort}`} />
          </div>
          <div className="move-trailer">
            <SkeletonBlock className="trailer-media" />
          </div>
        </div>
        {comingSoon ? (
          <aside className="col col-1-3">
            <h1><SkeletonBlock className={styles.asideHeading} /></h1>
            <div className="countdown-timer detail-countdown">
              {Array.from({ length: 4 }, (_, index) => (
                <span className="countdown-unit" key={index}>
                  <SkeletonBlock className={`${styles.countdownValue} countdown-value`} />
                  <SkeletonBlock className={`${styles.countdownLabel} countdown-label`} />
                </span>
              ))}
            </div>
          </aside>
        ) : (
          <aside className="col col-1-3 showtimes-schedule">
            <h1><SkeletonBlock className={styles.asideHeading} /></h1>
            {Array.from({ length: 3 }, (_, dayIndex) => (
              <div className="showtime-day" key={dayIndex}>
                <h2 className="day-of-week"><SkeletonBlock className={styles.dayLabel} /></h2>
                <div className="show-time-list">
                  {Array.from({ length: 4 }, (_, timeIndex) => (
                    <SkeletonBlock
                      className={`showtime-chip detail-showtime-chip ${styles.showtimeChip}`}
                      key={timeIndex}
                    />
                  ))}
                </div>
              </div>
            ))}
            <SkeletonBlock className={styles.bookNow} />
          </aside>
        )}
      </section>
    </div>
  );
}
