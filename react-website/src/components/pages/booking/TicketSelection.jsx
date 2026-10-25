import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  CINEMA_SEAT_CAPACITY,
  selectionDisplayLabel,
  selectionKey,
} from '../bookingApi';
import { StepHeader } from './BookingStepComponents';

function toCalendarDate(isoDate) {
  if (!isoDate) return null;
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function toIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getAvailabilityLevel(availability) {
  if (!availability?.showtimesCount) return 'none';
  const remainingPercent = availability.averageAvailableSeats / CINEMA_SEAT_CAPACITY;
  if (remainingPercent >= 0.6) return 'high';
  if (remainingPercent >= 0.25) return 'medium';
  return 'low';
}

export function TicketSelection({
  selections, selection, date, calendarMinDate, calendarMaxDate, time, selectedShowtimeId,
  tickets, totalTickets, showtimes, dates, pricing, calendarAvailability,
  calendarAvailabilityLoading, calendarAvailabilityError, onRetryCalendarAvailability,
  selectionLoading, selectionError, showtimeLoading, showtimeError, pricingLoading, pricingError,
  validation, validationLoading, onSelectionChange, onDateChange, onTimeChange, onTicketChange,
  onContinue,
}) {
  const movieSelections = selections.filter((item) => item.type === 'movie');
  const offerSelections = selections.filter((item) => item.type === 'offer');
  const calendarAvailabilityReady = Boolean(calendarAvailability)
    && !calendarAvailabilityLoading
    && !calendarAvailabilityError;
  const enabledCalendarDates = calendarAvailabilityReady
    ? dates
      .filter(({ isoDate }) => calendarAvailability[isoDate]?.showtimesCount > 0)
      .map(({ isoDate }) => toCalendarDate(isoDate))
    : dates.map(({ isoDate }) => toCalendarDate(isoDate));

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
          <label htmlFor="booking-date">Screening Date</label>
          <DatePicker
            id="booking-date"
            className="form-control"
            selected={toCalendarDate(date)}
            minDate={toCalendarDate(calendarMinDate)}
            maxDate={toCalendarDate(calendarMaxDate)}
            includeDates={enabledCalendarDates}
            dateFormat="EEE d MMM yyyy"
            calendarClassName="booking-date-calendar"
            dayClassName={(calendarDate) => {
              const availability = calendarAvailability?.[toIsoDate(calendarDate)];
              return calendarAvailabilityReady
                ? `booking-calendar-day--${getAvailabilityLevel(availability)}`
                : '';
            }}
            renderDayContents={(dayNumber, calendarDate) => {
              const availability = calendarAvailability?.[toIsoDate(calendarDate)];
              const level = getAvailabilityLevel(availability);
              const tooltip = level === 'none'
                ? 'No showings'
                : `${level[0].toUpperCase()}${level.slice(1)} availability: ${Math.round(availability.averageAvailableSeats)} average seats left across ${availability.showtimesCount} showing${availability.showtimesCount === 1 ? '' : 's'}`;
              return (
                <span className="booking-calendar-day-content" title={tooltip}>
                  {dayNumber}
                  {calendarAvailabilityReady && level !== 'none' && (
                    <span className={`booking-calendar-availability-dot booking-calendar-availability-dot--${level}`} aria-hidden="true" />
                  )}
                </span>
              );
            }}
            onChange={(selectedDate) => {
              if (selectedDate) onDateChange(toIsoDate(selectedDate));
            }}
            disabled={!selection}
            required
          />
          {calendarAvailabilityLoading && (
            <span className="showtime-placeholder" role="status">Checking showtimes and seat availability...</span>
          )}
          {calendarAvailabilityError && (
            <p className="form-notice" role="alert">
              Could not load date availability: {calendarAvailabilityError}{' '}
              <button
                className="booking-calendar-retry"
                type="button"
                onClick={onRetryCalendarAvailability}
              >
                Retry
              </button>
            </p>
          )}
          {calendarAvailabilityReady && (
            <>
              <p className="booking-calendar-availability-note">
                Average seats remaining across showtimes for that date.
              </p>
              <div className="booking-calendar-legend" aria-label="Screening availability legend">
                <span><i className="booking-calendar-availability-dot booking-calendar-availability-dot--high" />High (&gt;60%)</span>
                <span><i className="booking-calendar-availability-dot booking-calendar-availability-dot--medium" />Medium (25-60%)</span>
                <span><i className="booking-calendar-availability-dot booking-calendar-availability-dot--low" />Low (&lt;25%)</span>
              </div>
            </>
          )}
          {!dates.length && (
            <span className="showtime-placeholder" role="status">
              {showtimeLoading ? 'Loading screening dates...' : 'No screening dates available'}
            </span>
          )}
        </div>
        <div className="form-group">
          <label>Select Showtime</label>
          <div className="showtime-chips" aria-label="Available showtimes">
            {!selection
              ? <span className="showtime-placeholder">Select a film or offer to see available showtimes.</span>
              : showtimeLoading
                ? (
                  <span className="showtime-loading" role="status">
                    <span className="loader" aria-hidden="true" />
                    <span>Loading showtimes...</span>
                  </span>
                )
                : showtimeError
                  ? <span className="form-notice" role="alert">{showtimeError}</span>
                  : showtimes?.length
                    ? showtimes.map((showtime) => (
                      <button
                        className={`time-chip ${selectedShowtimeId === showtime.showtimeId ? 'active' : ''}`}
                        type="button"
                        aria-pressed={selectedShowtimeId === showtime.showtimeId}
                        key={showtime.showtimeId}
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
