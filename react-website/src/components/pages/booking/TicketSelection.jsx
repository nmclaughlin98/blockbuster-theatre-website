import {
  selectionDisplayLabel,
  selectionKey,
} from '../bookingApi';
import { StepHeader } from './BookingStepComponents';

export function TicketSelection({
  selections, selection, date, time, screen, tickets, totalTickets, showtimes, dates, pricing,
  selectionLoading, selectionError, showtimeLoading, showtimeError, pricingLoading, pricingError,
  validation, validationLoading, onSelectionChange, onDateChange, onTimeChange, onTicketChange,
  onContinue,
}) {
  const movieSelections = selections.filter((item) => item.type === 'movie');
  const offerSelections = selections.filter((item) => item.type === 'offer');

  return (
    <fieldset className="active" data-step="0">
      <StepHeader
        title="Step 1: Choose Film & Tickets"
        description="Select your movie, screening time, and quantity of tickets."
      />
      <div className="form-group">
        <label htmlFor="booking-movie">Select Film or Special Offer</label>
        <select id="booking-movie" className="form-control" value={selection ? selectionKey(selection) : ''} onChange={(event) => onSelectionChange(event.target.value)} required>
          <option value="" disabled>-- Choose a Film or Special Offer --</option>
          <optgroup label="Movies">
            {movieSelections.map((item) => (
              <option value={selectionKey(item)} key={selectionKey(item)}>{item.label}</option>
            ))}
          </optgroup>
          <optgroup label="Special Offers">
            {offerSelections.map((item) => (
              <option value={selectionKey(item)} key={selectionKey(item)}>{selectionDisplayLabel(item)}</option>
            ))}
          </optgroup>
        </select>
        {selectionLoading && <span className="showtime-placeholder" role="status">Loading films and special offers...</span>}
        {selectionError && <p className="form-notice" role="alert">{selectionError}</p>}
        {!selectionLoading && !selectionError && !selections.length
          && <p className="form-notice" role="status">No films or special offers are currently available.</p>}
      </div>
      <div className="date-time-group">
        <div className="form-group">
          <label htmlFor="booking-date">Day of Screening</label>
          <select id="booking-date" className="form-control" value={date} onChange={(event) => onDateChange(event.target.value)}>
            {!dates.length && (
              <option value="" disabled>
                {showtimeLoading ? 'Loading screening dates...' : 'No screening dates available'}
              </option>
            )}
            {dates.map((item) => <option value={item.label} key={item.label}>{item.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Select Showtime</label>
          <div className="showtime-chips" aria-label="Available showtimes">
            {!selection
              ? <span className="showtime-placeholder">Select a film or offer to see available showtimes.</span>
              : showtimeLoading
                ? <span role="status">Loading showtimes...</span>
                : showtimeError
                  ? <span className="form-notice" role="alert">{showtimeError}</span>
                  : showtimes?.length
                    ? showtimes.map((showtime) => (
                      <button
                        className={`time-chip ${time === showtime.time && screen === showtime.screen ? 'active' : ''}`}
                        type="button"
                        aria-pressed={time === showtime.time && screen === showtime.screen}
                        key={`${showtime.time}-${showtime.screen}`}
                        onClick={() => onTimeChange(showtime)}
                      >
                        <span className="time-chip-time">{showtime.time}</span>
                        <span className="time-chip-screen">Screen {showtime.screen}</span>
                      </button>
                    ))
                    : <span className="showtime-placeholder">
                      {selection.type === 'offer'
                        ? 'No showtimes are available for this offer and day.'
                        : 'No showtimes available for this selection and day.'}
                    </span>}
          </div>
        </div>
      </div>
      <div className="form-group ticket-type-list">
        <label>Select Ticket Types</label>
        {!selectionLoading
          && !showtimeLoading
          && !showtimeError
          && !pricingLoading
          && !pricingError
          && !time
          && (!selection || showtimes?.length > 0)
          && (
            <p className="showtime-placeholder" role="status">
              {selection
                ? 'Select a showtime to view ticket types and prices.'
                : 'Choose a film and showtime to view ticket types and prices.'}
            </p>
          )}
        {pricingLoading && <p role="status">Loading ticket prices...</p>}
        {pricingError && <p className="form-notice" role="alert">{pricingError}</p>}
        {!pricingLoading && !pricingError && selection && time && !pricing?.ticketTiers.length
          && <p className="form-notice" role="status">No ticket types are available for this showtime.</p>}
        {pricing?.ticketTiers.map((tier) => (
          <div className="ticket-row" key={tier.id}>
            <div className="ticket-info"><h4>{tier.label}</h4><span>{tier.description}</span></div>
            <div className="ticket-counter">
              <strong>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: tier.currency || 'GBP' }).format(tier.price)}</strong>
              <button className="counter-btn" type="button" aria-label={`Decrease ${tier.label}`} onClick={() => onTicketChange(tier.id, -1)}>−</button>
              <span className="counter-val" aria-live="polite">{tickets[tier.id] || 0}</span>
              <button className="counter-btn" type="button" aria-label={`Increase ${tier.label}`} onClick={() => onTicketChange(tier.id, 1)}>+</button>
            </div>
          </div>
        ))}
        {validation?.error && <p className="form-notice" role="alert">{validation.error}</p>}
        {validationLoading && <p role="status"></p>}
      </div>
      <div className="booking-subtotal-bar">
        <div className="subtotal-item booking-subtotal-values">
          <div className="subtotal-metric">
            <span>Selected:</span>
            <strong>{totalTickets} Seat{totalTickets === 1 ? '' : 's'}</strong>
          </div>
          <div className="subtotal-metric">
            <span>Total:</span>
            <strong>{validation?.quote ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(validation.quote.total) : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(0)}</strong>
          </div>
        </div>
      </div>
      <button type="button" className="form-button next booking-continue-button" onClick={onContinue}>Select Seats</button>
    </fieldset>
  );
}
