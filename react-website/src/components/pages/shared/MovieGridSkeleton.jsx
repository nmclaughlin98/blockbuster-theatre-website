import { SkeletonBlock } from '../../shared/SkeletonBlock/SkeletonBlock';
import styles from './PageSkeletons.module.css';

export function MovieGridSkeleton({ count = 7 }) {
  return (
    <div className="poster-section" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock className={styles.poster} key={index} />
      ))}
    </div>
  );
}
