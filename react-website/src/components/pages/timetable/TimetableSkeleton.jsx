import { SkeletonBlock } from '../../shared/SkeletonBlock/SkeletonBlock';
import styles from '../shared/PageSkeletons.module.css';

const SHOWTIME_COUNTS = [1, 2, 2, 3, 1];

export function TimetableSkeleton() {
  return (
    <div className={styles.page} role="status" aria-label="Loading movie timetable" aria-busy="true">
      <div className={styles.content}>
        <div className={`${styles.sectionHeading} ${styles.centeredHeading} ${styles.timetableHeader}`}>
          <div className={styles.headingText}>
            <SkeletonBlock className={styles.title} />
            <SkeletonBlock className={styles.subtitle} />
          </div>
        </div>
        <div className={styles.dayTabs} aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => (
            <SkeletonBlock className={styles.dayTab} key={index} />
          ))}
        </div>
        <div className={styles.timetableToolbar} aria-hidden="true">
          <SkeletonBlock className={styles.searchField} />
          <SkeletonBlock className={styles.downloadButton} />
        </div>
        <div className={styles.scheduleList} aria-hidden="true">
          {SHOWTIME_COUNTS.map((count, index) => (
            <div className={styles.scheduleRow} key={index}>
              <div className={styles.scheduleInfo}>
                <SkeletonBlock className={styles.scheduleTitle} />
                <SkeletonBlock className={styles.scheduleGenre} />
              </div>
              <div className={styles.scheduleTimes}>
                {Array.from({ length: count }, (_, timeIndex) => (
                  <SkeletonBlock className={styles.scheduleTime} key={timeIndex} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
