import { SkeletonBlock } from '../../shared/SkeletonBlock/SkeletonBlock';
import styles from './PageSkeletons.module.css';

export function CollectionGridSkeleton({ count = 7 }) {
  return (
    <div className={styles.collectionGrid} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <article className={styles.collectionCard} key={index}>
          <SkeletonBlock className={styles.collectionArtwork} />
          <div className={styles.collectionCardContent}>
            <SkeletonBlock className={styles.collectionTitle} />
            <SkeletonBlock className={styles.collectionDescription} />
            <SkeletonBlock className={`${styles.collectionDescription} ${styles.collectionDescriptionShort}`} />
          </div>
        </article>
      ))}
    </div>
  );
}
