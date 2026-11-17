import { Link } from 'react-router-dom';

export function BookNowFab() {
  return (
    <Link
      className="book-now-fab"
      to="/book-now"
      onClick={(e) => e.currentTarget.blur()}
    >
      <span className="material-symbols-outlined" aria-hidden="true">confirmation_number</span>
      Book Tickets
    </Link>
  );
}
