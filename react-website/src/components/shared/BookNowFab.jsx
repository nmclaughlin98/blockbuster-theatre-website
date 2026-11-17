// Persistent floating "Book Tickets" button, visible on scroll across all pages except the booking flow itself.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function BookNowFab() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 350);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Link
      className={`book-now-fab ${visible ? 'visible' : ''}`}
      to="/book-now"
      onClick={(e) => e.currentTarget.blur()}
    >
      <span className="material-symbols-outlined" aria-hidden="true">confirmation_number</span>
      Book Tickets
    </Link>
  );
}
