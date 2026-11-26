import styles from './BookNowFab.module.css';
import { Link } from 'react-router-dom';

export function BookNowFab() {
  return (
    <Link
      className={styles['book-now-fab']}
      to="/book-now"
      onClick={(e) => e.currentTarget.blur()}
    >
      <span className={`material-symbols-outlined ${styles['material-symbols-outlined']}`} aria-hidden="true">confirmation_number</span>
      Book Tickets
    </Link>
  );
}
