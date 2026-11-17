import { Link } from 'react-router-dom';

export function BookingShortcut() {
  return (
    <Link className="booking-shortcut" to="/book-now">
      Book Tickets
    </Link>
  );
}
