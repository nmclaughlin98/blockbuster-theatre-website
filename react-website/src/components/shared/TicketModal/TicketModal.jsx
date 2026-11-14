import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TicketQRCode } from '../TicketQRCode/TicketQRCode';
import styles from './TicketModal.module.css';

export function TicketModal({ booking, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const alreadyLocked = document.body.classList.contains('noScroll');
    document.body.classList.add('noScroll');
    closeButtonRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (!alreadyLocked) document.body.classList.remove('noScroll');
      if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [onClose]);

  const date = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${booking.date}T00:00:00Z`));

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="ticket-modal-title">
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Blockbuster Theatre</p>
            <h2 id="ticket-modal-title">Your ticket</h2>
          </div>
          <button ref={closeButtonRef} className={styles.close} type="button" onClick={onClose} aria-label="Close ticket">
            &times;
          </button>
        </div>
        <h3 className={styles.movieTitle}>{booking.movieTitle}</h3>
        <dl className={styles.details}>
          <div><dt>Showtime</dt><dd>{date} at {booking.time}</dd></div>
          <div><dt>Screen</dt><dd>{booking.screen}</dd></div>
          <div><dt>Seats</dt><dd>{booking.seats.join(', ')}</dd></div>
          <div><dt>Booking reference</dt><dd>{booking.bookingRef}</dd></div>
        </dl>
        <div className={styles.qrArea}>
          <TicketQRCode bookingRef={booking.bookingRef} />
        </div>
      </section>
    </div>,
    document.body,
  );
}
