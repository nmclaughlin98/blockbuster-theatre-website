import { SkeletonBlock } from '../../shared/SkeletonBlock/SkeletonBlock';
import headerStyles from '../../shared/SectionHeader/SectionHeader.module.css';
import { MovieGridSkeleton } from '../shared/MovieGridSkeleton';
import styles from '../shared/PageSkeletons.module.css';

export function ComingSoonSkeleton() {
  return (
    <div role="status" aria-label="Loading coming soon movies" aria-busy="true">
      <section className="movie-poster">
        <div className={headerStyles['section-header']}>
          <div className={headerStyles.content}>
            <div className={headerStyles.title}>
              <SkeletonBlock className={styles.nowShowingTitle} />
            </div>
            <SkeletonBlock className={`${headerStyles.description} ${styles.nowShowingDescription}`} />
          </div>
        </div>
        <MovieGridSkeleton count={14} />
      </section>
    </div>
  );
}
