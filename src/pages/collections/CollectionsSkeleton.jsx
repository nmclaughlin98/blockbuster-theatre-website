import { CollectionGridSkeleton } from '../shared/CollectionGridSkeleton';
import styles from '../shared/PageSkeletons.module.css';

export function CollectionsSkeleton() {
  return (
    <div className={styles.page} role="status" aria-label="Loading collections" aria-busy="true">
      <div className={styles.content}>
        <CollectionGridSkeleton />
      </div>
    </div>
  );
}
