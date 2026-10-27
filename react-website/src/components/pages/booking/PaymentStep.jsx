import { useRef, useState } from 'react';
import {
  createGuestBooking,
  createGuestBookingPayload,
  getBookedSeats,
} from '../shared/bookingApi';
import { StepHeader } from './BookingStepComponents';

function formatScreeningDate(date, time) {
  const parsedDate = new Date(`${date}T00:00:00Z`);
  const formattedDate = !Number.isNaN(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === date
    ? new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(parsedDate).replace(',', '').replace(/^Thu(?=\s)/, 'Thurs')
    : date;

  return `${formattedDate} - ${time}`;
}

export function PaymentStep({
  initialData, onBack, onNext, onSeatConflict, onTicketIssue, onToast,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const showtime = initialData.showtime;
  const customer = initialData.customer;
  const seats = initialData.seats;
  const tickets = Object.entries(initialData.tickets || {})
    .filter(([, quantity]) => quantity > 0)
    .map(([tierId, quantity]) => ({ tierId, quantity }));

  async function confirmBooking() {
    if (submittingRef.current) return;

    if (!initialData.quote || !initialData.selection) {
      onTicketIssue('Your ticket choices must be validated before proceeding.');
      return;
    }
    if (!showtime?.showtimeId || !showtime.date) {
      onTicketIssue('Please choose the screening again before completing your booking.');
      return;
    }
    if (!seats.length) {
      onSeatConflict('Select at least one seat before confirming your booking.');
      return;
    }

    let bookedSeats;
    try {
      bookedSeats = await getBookedSeats(showtime.showtimeId, showtime.date);
    } catch (error) {
      onSeatConflict(error.message || 'Seat availability could not be verified. Please try again.');
      return;
    }
    if (seats.some((seat) => bookedSeats.includes(seat))) {
      onSeatConflict('Seat availability changed. Please choose your seats again.');
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const payload = createGuestBookingPayload({
        showtimeId: showtime.showtimeId,
        date: showtime.date,
        seats,
        email: customer.email,
        customerName: `${customer.firstName} ${customer.surname}`,
        tickets,
        ...(initialData.selection.type === 'offer'
          ? { offerId: initialData.selection.offerId }
          : {}),
      });
      const details = await createGuestBooking(payload);
      if (details.showtimeId !== showtime.showtimeId || details.date !== showtime.date) {
        throw new Error('The booking service returned a confirmation for a different screening. Please contact support.');
      }
      onNext(details);
    } catch (error) {
      if (error.status === 409) {
        onSeatConflict('Those seats were just booked by someone else. Availability has been refreshed; please choose again.');
      } else if (error.status === 400) {
        onToast(error.message || 'Please check the booking details and try again.');
      } else if (error.status === 404) {
        onToast('The selected movie, offer, or screening could not be found. Please choose another screening.');
      } else if (error.status >= 500 || !error.status) {
        onToast('We could not reach the booking service. Your booking was not confirmed. Please retry or contact support.');
      } else {
        onToast(`Could not complete your booking: ${error.message}`);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <fieldset className="active" data-step="3">
      <StepHeader
        title="Step 4: Review Your Booking"
        description="Review the details below to reserve your seats. No card details are collected or submitted."
      />
      <div className="ticket-details-grid">
        <div className="ticket-detail-item"><span>Film</span><strong>{initialData.selection?.title || 'Selected film'}</strong></div>
        <div className="ticket-detail-item"><span>Showtime</span><strong>{formatScreeningDate(showtime?.date || initialData.date, showtime?.time || '')}</strong></div>
        <div className="ticket-detail-item"><span>Screen</span><strong>Screen {showtime?.screen || ''}</strong></div>
        <div className="ticket-detail-item"><span>Guest</span><strong>{customer.firstName} {customer.surname}</strong></div>
        <div className="ticket-detail-item"><span>Email</span><strong>{customer.email}</strong></div>
        <div className="ticket-detail-item"><span>Seats</span><strong>{seats.join(', ')}</strong></div>
        <div className="ticket-detail-item"><span>Total</span><strong>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(initialData.quote?.total || 0)}</strong></div>
      </div>
      <p className="form-notice" role="status">
        This flow records a booking reservation only. The displayed total is retained for your reference; payment is not taken.
      </p>
      <div className="form-actions">
        <button className="form-button previous" type="button" onClick={onBack} disabled={isSubmitting}>Back</button>
        <button
          className="form-button next"
          type="button"
          onClick={confirmBooking}
          disabled={isSubmitting}
          aria-live="polite"
        >
          {isSubmitting ? 'Confirming booking...' : 'Confirm booking'}
        </button>
      </div>
    </fieldset>
  );
}
