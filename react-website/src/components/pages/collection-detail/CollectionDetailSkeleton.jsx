import { SkeletonBlock } from '../../shared/SkeletonBlock/SkeletonBlock';
import { MovieGridSkeleton } from '../shared/MovieGridSkeleton';
import styles from '../shared/PageSkeletons.module.css';

export function CollectionDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading collection" aria-busy="true">
      <section className={styles.collectionHero} aria-hidden="true">
        <SkeletonBlock className={styles.collectionHeroArtwork} />
        <div className={styles.collectionHeroContent}>
          <SkeletonBlock className={styles.subtitle} />
          <SkeletonBlock className={styles.collectionHeroTitle} />
          <SkeletonBlock className={styles.collectionHeroDescription} />
          <SkeletonBlock className={`${styles.collectionHeroDescription} ${styles.collectionHeroDescriptionShort}`} />
        </div>
      </section>
      <section className={styles.collectionBody}>
        <SkeletonBlock className={styles.backButton} />
        <div className={styles.sectionHeading}>
          <div className={styles.headingText}>
            <SkeletonBlock className={styles.title} />
            <SkeletonBlock className={styles.subtitle} />
          </div>
        </div>
        <MovieGridSkeleton />
      </section>
    </div>
  );
}
