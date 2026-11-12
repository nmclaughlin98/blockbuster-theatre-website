import { SkeletonBlock } from '../../shared/SkeletonBlock/SkeletonBlock';
import headerStyles from '../../shared/SectionHeader/SectionHeader.module.css';
import { CollectionGridSkeleton } from '../shared/CollectionGridSkeleton';
import { MovieGridSkeleton } from '../shared/MovieGridSkeleton';
import styles from '../shared/PageSkeletons.module.css';

export function NowShowingSkeleton({ view }) {
  const isMoviesView = view === 'movies';

  return (
    <div
      role="status"
      aria-label={isMoviesView ? 'Loading now showing movies' : 'Loading collections'}
      aria-busy="true"
    >
      <section className={`movie-poster ${styles.nowShowingSection}`}>
        <div className={headerStyles['section-header']}>
          <div className={headerStyles.content}>
            <div className={headerStyles.title}>
              <SkeletonBlock className={styles.nowShowingTitle} />
            </div>
            <SkeletonBlock className={`${headerStyles.description} ${styles.nowShowingDescription}`} />
          </div>
          {isMoviesView && <SkeletonBlock className={styles.nowShowingAction} />}
        </div>
        <div className={styles.switch} aria-hidden="true">
          <SkeletonBlock className={`${styles.switchItem} ${styles.activeSwitchItem}`} />
          <SkeletonBlock className={styles.switchItem} />
        </div>
        {isMoviesView ? (
          <>
            <div className="genre-filter-container" aria-hidden="true">
              <div className="movie-filter-controls">
                <div className="search-wrapper">
                  <SkeletonBlock className={`${styles.filterLabel} ${styles.searchLabel}`} />
                  <SkeletonBlock className={styles.filterField} />
                </div>
                <div className="sort-wrapper">
                  <SkeletonBlock className={`${styles.filterLabel} ${styles.sortLabel}`} />
                  <SkeletonBlock className={styles.filterField} />
                </div>
              </div>
              <div className="genre-tabs">
                {Array.from({ length: 16 }, (_, index) => (
                  <SkeletonBlock className={styles.genreChip} key={index} />
                ))}
              </div>
            </div>
            <MovieGridSkeleton count={24} />
          </>
        ) : <CollectionGridSkeleton />}
      </section>
    </div>
  );
}
