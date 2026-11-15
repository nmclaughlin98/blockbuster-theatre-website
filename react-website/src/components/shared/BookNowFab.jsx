// Persistent floating "Book Tickets" button, visible on scroll across all pages except the booking flow itself.
import { useEffect, useState } from 'react';

export function BookNowFab({ current }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 350);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (current === 'booking') return null;

  return (
    <a
      className={`book-now-fab ${visible ? 'visible' : ''}`}
      href="./bookNow.html"
      onClick={(e) => e.currentTarget.blur()}
    >
      <span className="material-symbols-outlined" aria-hidden="true">confirmation_number</span>
      Book Tickets
    </a>
  );
}
