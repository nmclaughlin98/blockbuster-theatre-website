import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TicketPass } from '../TicketPass/TicketPass';
import styles from './TicketModal.module.css';

export function TicketModal({ booking, onClose, showQRCode = true }) {
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

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label={showQRCode ? 'Your ticket' : 'Booking details'}>
        <TicketPass
          movieTitle={booking.movieTitle}
          date={booking.date}
          time={booking.time}
          screen={booking.screen}
          seats={booking.seats}
          bookingRef={booking.bookingRef}
          guestName={booking.guestName}
          ticketCount={booking.ticketCount}
          total={booking.totalAmount !== undefined && booking.currency !== undefined
            ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: booking.currency }).format(booking.totalAmount)
            : undefined}
          isShowBookingConfirmedIndicator={false}
          showQRCode={showQRCode}
          headerAction={(
            <button ref={closeButtonRef} className={styles.close} type="button" onClick={onClose} aria-label={showQRCode ? 'Close ticket' : 'Close booking details'}>
              &times;
            </button>
          )}
        />
      </section>
    </div>,
    document.body,
  );
}
