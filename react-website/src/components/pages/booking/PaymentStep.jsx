import { StepHeader } from './BookingStepComponents';

export function PaymentStep({
  onBack, onConfirm, isSubmitting, movieTitle, seats, totalAmount, customer,
}) {
  return (
    <fieldset className="active" data-step="3">
      <StepHeader
        title="Step 4: Review Your Booking"
        description="Review the details below to reserve your seats. No card details are collected or submitted."
      />
      <div className="ticket-details-grid">
        <div className="ticket-detail-item"><span>Film</span><strong>{movieTitle}</strong></div>
        <div className="ticket-detail-item"><span>Guest</span><strong>{customer.firstName} {customer.surname}</strong></div>
        <div className="ticket-detail-item"><span>Email</span><strong>{customer.email}</strong></div>
        <div className="ticket-detail-item"><span>Seats</span><strong>{seats.join(', ')}</strong></div>
        <div className="ticket-detail-item"><span>Total</span><strong>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(totalAmount)}</strong></div>
      </div>
      <p className="form-notice" role="status">
        This flow records a booking reservation only. The displayed total is retained for your reference; payment is not taken.
      </p>
      <div className="form-actions">
        <button className="form-button previous" type="button" onClick={onBack} disabled={isSubmitting}>Back</button>
        <button
          className="form-button next"
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          aria-live="polite"
        >
          {isSubmitting ? 'Confirming booking...' : 'Confirm booking'}
        </button>
      </div>
    </fieldset>
  );
}
