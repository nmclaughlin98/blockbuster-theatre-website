import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout, asset } from '../shared';
import { Toast } from '../shared/Toast';
import {
  getBookingSelections,
  createCheckoutPayload,
  getMovieDetailIdForSelection,
  getMovieDetail,
  getSelectionShowtimeDates,
  getSelectionShowtimes,
  getTicketPricing,
  selectionDisplayLabel,
  selectionKey,
  validateCheckout,
} from './bookingApi';

const steps = ['Tickets', 'Select Seats', 'Guest Info', 'Payment', 'Confirmed'];
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const bookedSeats = new Set(['B4', 'C2', 'C3', 'D7', 'D8', 'E3', 'E4', 'E9', 'F9', 'F10', 'G3', 'G4', 'G9']);
const accessibleSeats = new Set(['A1', 'A5', 'A6', 'A10']);

function createUpcomingDates() {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return { label: formatter.format(date).replace(/,/g, ''), weekday: weekdayNames[date.getDay()] };
  });
}

function findDate(dates, dayParam) {
  const query = dayParam.trim().toLowerCase();
  return dates.find((date) => date.label.toLowerCase() === query)
    || dates.find((date) => date.weekday.toLowerCase() === query || date.weekday.slice(0, 3).toLowerCase() === query)
    || dates[0];
}

function ProgressBar({ currentStep }) {
  return (
    <ol id="progressbar" aria-label="Booking progress">
      {steps.map((label, index) => (
        <li
          className={`${index <= currentStep ? 'active' : ''} ${index < currentStep || (index === currentStep && currentStep === steps.length - 1) ? 'completed' : ''
            }`}
          key={label}
        >
          {label}
        </li>
      ))}
    </ol>
  );
}

function StepHeader({ title, description }) {
  return <div className="step-header"><h2>{title}</h2><p>{description}</p></div>;
}

function StepActions({ onBack, onContinue, continueLabel }) {
  return (
    <div className="form-actions">
      <button className="form-button previous" type="button" onClick={onBack}>Back</button>
      <button className="form-button next" type="button" onClick={onContinue}>{continueLabel}</button>
    </div>
  );
}

function TicketSelection({
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
        <div className="subtotal-item">
          <button type="button" className="form-button next" onClick={onContinue}>Select Seats</button>
        </div>
      </div>
    </fieldset>
  );
}

function SeatSelection({ selectedSeats, totalTickets, onToggleSeat, onBack, onContinue }) {
  const [hoveredSeat, setHoveredSeat] = useState(null);

  function updateSeatTooltip(seatId, x, y) {
    const offset = 12;
    const tooltipWidth = 84;
    const tooltipHeight = 40;
    const left = x + offset + tooltipWidth < window.innerWidth - 8
      ? x + offset
      : x - offset - tooltipWidth;
    const top = y + offset + tooltipHeight < window.innerHeight - 8
      ? y + offset
      : y - offset - tooltipHeight;

    setHoveredSeat({
      seatId,
      left: Math.max(8, left),
      top: Math.max(8, top),
    });
  }

  function handleSeatPointer(seatId, event) {
    if (event.pointerType !== 'mouse') return;
    if (event.target.closest('.seat-spacer')) {
      setHoveredSeat(null);
      return;
    }

    updateSeatTooltip(seatId, event.clientX, event.clientY);
  }

  return (
    <fieldset className="active" data-step="1">
      <StepHeader
        title="Step 2: Reserve Your Seats"
        description={`Please choose exactly ${totalTickets} seat${totalTickets === 1 ? '' : 's'} on the map below.`}
      />
      <div className="seating-plan">
        <div className="screen-container"><div className="screen" /><div className="screen-text">MAIN CINEMA SCREEN (CURVED)</div></div>
        <div className="seat-legend-container">
          <div className="seat-legend">
            <div className="legend-item"><div className="legend-seat" /><span>Available</span></div>
            <div className="legend-item"><div className="legend-seat booked-seat" /><span>Booked</span></div>
            <div className="legend-item"><div className="legend-seat selected-seat" /><span>Your Pick</span></div>
            <div className="legend-item">
              <div className="legend-seat seat-accessible">
                <img src={asset('assets/images/icons/accessible.png')} alt="" />
              </div>
              <span>Accessible</span>
            </div>
          </div>
        </div>
        <div className="seat-grid" aria-label="Cinema seating plan">
          {Array.from({ length: 7 }, (_, rowIndex) => {
            const row = String.fromCharCode(65 + rowIndex);
            return (
              <div className="seat-row" key={row}>
                <span className="row-label">{row}</span>
                {Array.from({ length: row === 'G' ? 11 : 10 }, (_, seatIndex) => {
                  const seatId = `${row}${seatIndex + 1}`;
                  const isBooked = bookedSeats.has(seatId);
                  const isAccessible = accessibleSeats.has(seatId);
                  const isSelected = selectedSeats.includes(seatId);
                  return (
                    <span
                      className="seat-cell"
                      key={seatId}
                      onPointerEnter={(event) => handleSeatPointer(seatId, event)}
                      onPointerMove={(event) => handleSeatPointer(seatId, event)}
                      onPointerLeave={() => setHoveredSeat(null)}
                    >
                      {row !== 'G' && seatIndex === 5 && <span className="seat seat-spacer" aria-hidden="true" />}
                      <button
                        className={`seat ${isAccessible ? 'seat-accessible' : ''} ${isBooked ? 'booked-seat' : ''} ${isSelected ? 'selected-seat' : ''}`}
                        type="button"
                        disabled={isBooked}
                        aria-label={`Seat ${seatId}${isAccessible ? ', accessible' : ''}${isBooked ? ', booked' : ''}${isSelected ? ', selected' : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => onToggleSeat(seatId)}
                        onFocus={(event) => {
                          const bounds = event.currentTarget.getBoundingClientRect();
                          updateSeatTooltip(seatId, bounds.right, bounds.top);
                        }}
                        onBlur={() => setHoveredSeat(null)}
                      >
                        {isAccessible && <img src={asset('assets/images/icons/accessible.png')} alt="" className="seat-accessible-icon" />}
                      </button>
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
        {hoveredSeat && (
          <div
            className="seat-hover-tooltip"
            style={{ left: hoveredSeat.left, top: hoveredSeat.top }}
            aria-hidden="true"
          >
            <strong>{hoveredSeat.seatId}</strong>
          </div>
        )}
        <div className="selected-seats-badge">
          Selected Seats: <strong>{selectedSeats.length ? selectedSeats.join(', ') : 'None selected yet'}</strong>
        </div>
      </div>
      <StepActions onBack={onBack} onContinue={onContinue} continueLabel="Guest Info" />
    </fieldset>
  );
}

function GuestDetails({ customer, onChange, onBack, onContinue }) {
  return (
    <fieldset className="active" data-step="2">
      <StepHeader title="Step 3: Guest Details" description="Where should we send your digital cinema ticket preview?" />
      <div className="guest-name-grid">
        <div className="form-group"><label htmlFor="guest-first-name">First Name</label><input type="text" id="guest-first-name" value={customer.firstName} onChange={(event) => onChange('firstName', event.target.value)} autoComplete="given-name" required /></div>
        <div className="form-group"><label htmlFor="guest-surname">Surname</label><input type="text" id="guest-surname" value={customer.surname} onChange={(event) => onChange('surname', event.target.value)} autoComplete="family-name" required /></div>
      </div>
      <div className="form-group"><label htmlFor="guest-email">Email Address</label><input id="guest-email" type="email" value={customer.email} onChange={(event) => onChange('email', event.target.value)} autoComplete="email" required /></div>
      <div className="form-group"><label htmlFor="guest-phone">Phone Number (Optional)</label><input id="guest-phone" type="tel" value={customer.phone} onChange={(event) => onChange('phone', event.target.value)} autoComplete="tel" /></div>
      <StepActions onBack={onBack} onContinue={onContinue} continueLabel="Continue to Payment" />
    </fieldset>
  );
}

function DemoPayment({ onBack, onConfirm, onPaymentInput }) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const demoNoticeShown = useRef(false);
  const paymentMethods = [
    { id: 'card', label: 'Credit / Debit Card' },
    { id: 'apple-pay', label: 'Apple Pay' },
    { id: 'google-pay', label: 'Google Pay' },
  ];

  function handlePaymentInput(event) {
    if (!event.currentTarget.value.trim() || demoNoticeShown.current) return;
    demoNoticeShown.current = true;
    onPaymentInput();
  }

  return (
    <fieldset className="active" data-step="3">
      <StepHeader title="Step 4: Payment" description="Choose a demo payment option to continue to your ticket preview." />
      {paymentMethod === 'card' && (
        <div className="card-preview-container" aria-label="Sample payment card preview">
          <div className="credit-card-mockup">
            <div className="demo-card-top-row">
              <span className="card-chip" />
              <strong className="demo-card-brand">VISA</strong>
            </div>
            <div className="card-number-display" aria-label="Masked sample card number">•••• •••• •••• ••••</div>
            <div className="card-meta-row">
              <div className="card-holder-display">Cardholder<span>Your Name</span></div>
              <div className="card-expiry-display">Expires<span>MM/YY</span></div>
            </div>
          </div>
        </div>
      )}
      <div className="payment-methods-grid" role="group" aria-label="Demo payment method">
        {paymentMethods.map((method) => (
          <button
            className={`payment-chip ${paymentMethod === method.id ? 'active' : ''}`}
            type="button"
            aria-pressed={paymentMethod === method.id}
            key={method.id}
            onClick={() => setPaymentMethod(method.id)}
          >
            {method.label}
          </button>
        ))}
      </div>
      {paymentMethod === 'card' ? (
        <div className="demo-payment-fields" role="group" aria-label="Optional demo card details">
          <div className="demo-payment-field-group">
            <label className="demo-payment-field-label" htmlFor="demo-card-number">Card Number</label>
            <input
              className="demo-payment-field"
              id="demo-card-number"
              type="text"
              inputMode="numeric"
              placeholder="Card number"
              onChange={handlePaymentInput}
            />
          </div>
          <div className="demo-payment-field-group">
            <label className="demo-payment-field-label" htmlFor="demo-cardholder-name">Cardholder Name</label>
            <input
              className="demo-payment-field"
              id="demo-cardholder-name"
              type="text"
              placeholder="Name on card"
              onChange={handlePaymentInput}
            />
          </div>
          <div className="demo-payment-fields-row">
            <div className="demo-payment-field-group">
              <label className="demo-payment-field-label" htmlFor="demo-card-expiration">Expiration (MM/YY)</label>
              <input
                className="demo-payment-field"
                id="demo-card-expiration"
                type="text"
                inputMode="numeric"
                placeholder="MM/YY"
                onChange={handlePaymentInput}
              />
            </div>
            <div className="demo-payment-field-group">
              <label className="demo-payment-field-label" htmlFor="demo-card-security-code">Security Code (CVV)</label>
              <input
                className="demo-payment-field"
                id="demo-card-security-code"
                type="text"
                inputMode="numeric"
                placeholder="CVV"
                onChange={handlePaymentInput}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="demo-payment-wallet" role="status">
          {paymentMethod === 'apple-pay' ? 'Apple Pay' : 'Google Pay'} is not connected in this demo. No payment will be processed.
        </p>
      )}
      <div className="form-actions">
        <button className="form-button previous" type="button" onClick={onBack}>Back</button>
        <button className="form-button next" type="button" onClick={onConfirm}>Create Demo Ticket</button>
      </div>
    </fieldset>
  );
}

function BookingConfirmation({ movie, date, time, screen, selectedSeats, totalTickets, totalPrice, customer, bookingRef }) {
  return (
    <fieldset className="active" data-step="4">
      <StepHeader title="Demo Ticket Preview" description="This is a preview only. No payment was processed or seats reserved." />
      <div className="ticket-pass">
        <div className="ticket-pass-header">
          <div className="ticket-pass-brand">BLOCKBUSTER THEATRE</div>
          <div className="ticket-pass-status">DEMO PREVIEW</div>
        </div>
        <div className="ticket-pass-body">
          <div className="ticket-movie-title">{movie?.title || 'Movie'}</div>
          <div className="ticket-details-grid">
            <div className="ticket-detail-item"><span>Date & Showtime</span><strong>{date} at {time}</strong></div>
            <div className="ticket-detail-item"><span>Screen / Hall</span><strong>Screen {screen}</strong></div>
            <div className="ticket-detail-item"><span>Seat Numbers</span><strong>{selectedSeats.join(', ')}</strong></div>
            <div className="ticket-detail-item"><span>Demo Total</span><strong>£{totalPrice.toFixed(2)}</strong></div>
            <div className="ticket-detail-item"><span>Guest Name</span><strong>{customer.firstName} {customer.surname}</strong></div>
            <div className="ticket-detail-item"><span>Ticket Breakdown</span><strong>{totalTickets} Ticket{totalTickets === 1 ? '' : 's'}</strong></div>
          </div>
          <div className="ticket-perforation"><div className="ticket-perforation-line" /></div>
          <div className="ticket-barcode-area"><div className="ticket-booking-ref">DEMO REF: {bookingRef}</div></div>
        </div>
      </div>
      <a className="form-button previous home" href="./index.html">Back to Home</a>
    </fieldset>
  );
}

export function Booking() {
  const [selectionState, setSelectionState] = useState({ selections: [], loading: true, error: null });
  const [step, setStep] = useState(0);
  const [selectedKey, setSelectedKey] = useState('');
  const [dateOverride, setDateOverride] = useState('');
  const [selectedTime, setSelectedTime] = useState(() => new URLSearchParams(window.location.search).get('time') || '');
  const [selectedScreen, setSelectedScreen] = useState('');
  const [screeningChanged, setScreeningChanged] = useState(false);
  const [tickets, setTickets] = useState({});
  const [movieDetailState, setMovieDetailState] = useState({ movie: null, loading: false, error: null });
  const [pricingState, setPricingState] = useState({ requestKey: '', pricing: null, loading: false, error: null });
  const [validationState, setValidationState] = useState({ requestKey: '', quote: null, loading: false, error: null });
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [customer, setCustomer] = useState({ firstName: '', surname: '', email: '', phone: '' });
  const [bookingRef, setBookingRef] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const formRef = useRef(null);
  const dates = useMemo(() => createUpcomingDates(), []);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const { selections, loading: selectionLoading, error: selectionError } = selectionState;
  const selectedSelection = selections.find((item) => selectionKey(item) === selectedKey) || null;
  const requestedTime = params.get('time') || '';
  const detailMovieId = getMovieDetailIdForSelection(selectedSelection);
  const currentMovieDetail = detailMovieId != null
    && movieDetailState.requestKey === selectionKey(selectedSelection)
    ? movieDetailState
    : null;
  const availableDates = selectedSelection
    ? getSelectionShowtimeDates(selectedSelection, currentMovieDetail?.movie, dates)
    : dates;
  const requestedTimeDate = !params.get('day') && requestedTime && selectedSelection
    ? availableDates.find((item) => getSelectionShowtimes(
      selectedSelection,
      currentMovieDetail?.movie,
      item.weekday,
    )?.some((slot) => slot.time === requestedTime))
    : null;
  const currentDate = (dateOverride && availableDates.find((item) => item.label === dateOverride))
    || requestedTimeDate
    || findDate(availableDates, params.get('day') || '');
  const date = currentDate?.label || '';
  const showtimes = selectedSelection
    ? getSelectionShowtimes(selectedSelection, currentMovieDetail?.movie, currentDate?.weekday)
    : null;
  const time = showtimes?.some((slot) => slot.time === selectedTime)
    ? selectedTime
    : !screeningChanged && showtimes?.some((slot) => slot.time === requestedTime) ? requestedTime : '';
  const screen = showtimes?.find((slot) => slot.time === time && slot.screen === selectedScreen)?.screen
    || showtimes?.find((slot) => slot.time === time)?.screen
    || '';
  const day = currentDate?.weekday || '';
  const totalTickets = Object.values(tickets).reduce((total, count) => total + count, 0);
  const pricingRequestKey = selectedSelection && time
    ? `${selectionKey(selectedSelection)}|${day}|${time}`
    : '';
  const pricing = pricingState.requestKey === pricingRequestKey ? pricingState.pricing : null;
  const pricingLoading = Boolean(pricingRequestKey && (
    pricingState.requestKey !== pricingRequestKey || pricingState.loading
  ));
  const pricingError = pricingState.requestKey === pricingRequestKey ? pricingState.error : null;
  const checkoutRequestKey = pricing && selectedSelection && totalTickets > 0
    ? JSON.stringify([selectionKey(selectedSelection), day, time, tickets])
    : '';
  const validation = validationState.requestKey === checkoutRequestKey && checkoutRequestKey
    ? validationState
    : null;
  const validationLoading = Boolean(checkoutRequestKey && (
    validationState.requestKey !== checkoutRequestKey || validationState.loading
  ));

  useEffect(() => {
    const controller = new AbortController();
    getBookingSelections(controller.signal)
      .then(({ selections: items, error: warning }) => {
        setSelectionState({ selections: items, loading: false, error: warning });
        const requestedOfferId = params.get('offerId');
        const requestedOffer = items.find((item) => (
          item.type === 'offer'
          && requestedOfferId
          && String(item.offerId) === requestedOfferId
        ));
        if (requestedOffer) {
          setSelectedKey(selectionKey(requestedOffer));
          return;
        }

        const requestedMovie = params.get('movie')?.trim().toLowerCase();
        const requested = items.find((item) => (
          item.type === 'movie'
          && requestedMovie
          && [item.title, item.slug, item.id, item.movieId]
            .some((value) => String(value).toLowerCase() === requestedMovie)
        ));
        if (requested) setSelectedKey(selectionKey(requested));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setSelectionState({ selections: [], loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [params]);

  useEffect(() => {
    const movieId = getMovieDetailIdForSelection(selectedSelection);
    if (movieId == null) return undefined;

    const controller = new AbortController();
    const requestKey = selectionKey(selectedSelection);
    getMovieDetail(movieId, controller.signal)
      .then((movie) => setMovieDetailState({ requestKey, movie, loading: false, error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setMovieDetailState({ requestKey, movie: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [selectedSelection]);

  useEffect(() => {
    if (!pricingRequestKey || !selectedSelection) {
      return undefined;
    }

    const controller = new AbortController();
    const requestKey = pricingRequestKey;
    getTicketPricing(selectedSelection, day, time, controller.signal)
      .then((nextPricing) => {
        if (controller.signal.aborted) return;
        setPricingState({ requestKey, pricing: nextPricing, loading: false, error: null });
        setTickets((current) => {
          const tierIds = new Set(nextPricing.ticketTiers.map((tier) => String(tier.id)));
          const next = Object.fromEntries(
            Object.entries(current).filter(([tierId]) => tierIds.has(tierId)),
          );
          if (!Object.values(next).some((quantity) => quantity > 0) && nextPricing.ticketTiers[0]) {
            next[nextPricing.ticketTiers[0].id] = 1;
          }
          return next;
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPricingState({ requestKey, pricing: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [pricingRequestKey, selectedSelection, day, time]);

  useEffect(() => {
    if (!checkoutRequestKey || !pricing || !selectedSelection) {
      return undefined;
    }

    const controller = new AbortController();
    const requestKey = checkoutRequestKey;
    const payload = createCheckoutPayload(selectedSelection, day, time, tickets);
    validateCheckout(payload, controller.signal)
      .then((quote) => {
        if (!controller.signal.aborted) setValidationState({ requestKey, quote, loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setValidationState({ requestKey, quote: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [checkoutRequestKey, pricing, selectedSelection, day, time, tickets]);

  function changeSelection(value) {
    setSelectedKey(value);
    setSelectedTime('');
    setSelectedScreen('');
    setScreeningChanged(true);
    setSelectedSeats([]);
    setTickets({});
    setMovieDetailState({ requestKey: '', movie: null, loading: false, error: null });
    setPricingState({ requestKey: '', pricing: null, loading: false, error: null });
    setValidationState({ requestKey: '', quote: null, loading: false, error: null });
  }

  function changeDate(label) {
    setDateOverride(label);
    setSelectedTime('');
    setSelectedScreen('');
    setScreeningChanged(true);
    setSelectedSeats([]);
    setPricingState({ requestKey: '', pricing: null, loading: false, error: null });
    setValidationState({ requestKey: '', quote: null, loading: false, error: null });
  }

  function changeTime(showtime) {
    if (showtime.time === time && showtime.screen === screen) return;

    setSelectedTime(showtime.time);
    setSelectedScreen(showtime.screen);
    if (showtime.time === time) return;
    setScreeningChanged(true);
    setSelectedSeats([]);
    setPricingState({ requestKey: '', pricing: null, loading: false, error: null });
    setValidationState({ requestKey: '', quote: null, loading: false, error: null });
  }

  function changeTicketCount(tierId, amount) {
    if (amount > 0 && totalTickets >= 10) {
      setToastMessage('Maximum of 10 tickets allowed.');
      return;
    }
    if (amount < 0 && !tickets[tierId]) return;

    const nextTickets = { ...tickets, [tierId]: Math.max(0, (tickets[tierId] || 0) + amount) };
    const nextTotal = Object.values(nextTickets).reduce((total, count) => total + count, 0);
    setTickets(nextTickets);
    setValidationState({ requestKey: '', quote: null, loading: false, error: null });
    setSelectedSeats((current) => current.slice(0, nextTotal));
  }

  function toggleSeat(seatId) {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats((current) => current.filter((seat) => seat !== seatId));
      return;
    }
    if (selectedSeats.length >= totalTickets) {
      setToastMessage(`You can select up to ${totalTickets} seat${totalTickets === 1 ? '' : 's'}.`);
      return;
    }
    setSelectedSeats((current) => [...current, seatId]);
  }

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function goToStep(nextStep) {
    setToastMessage('');
    setStep(nextStep);
    window.requestAnimationFrame(() => {
      document.getElementById('progressbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function continueFromTickets() {
    if (!selectedSelection) {
      setToastMessage('Please choose a film or special offer before selecting seats.');
      return;
    }
    if (!time || !showtimes?.some((slot) => slot.time === time)) {
      setToastMessage('Please choose an available showtime before selecting seats.');
      return;
    }
    if (!totalTickets) {
      setToastMessage('Please select at least one ticket before choosing seats.');
      return;
    }
    if (validationLoading) {
      setToastMessage('Your ticket choices are still being confirmed. Please wait and try again.');
      return;
    }
    if (!validation?.quote) {
      setToastMessage(validation?.error || 'Your ticket choices could not be confirmed. Please review them and try again.');
      return;
    }
    goToStep(1);
  }

  function continueFromSeats() {
    if (selectedSeats.length !== totalTickets) {
      setToastMessage('Please pick all seats to continue.');
      return;
    }
    goToStep(2);
  }

  function continueFromGuestDetails() {
    const fieldset = formRef.current?.querySelector('[data-step="2"]');
    const requiredInputs = [...(fieldset?.querySelectorAll('input[required]') || [])];
    const invalidInput = requiredInputs.find((input) => !input.value.trim() || !input.checkValidity());
    if (invalidInput) {
      setToastMessage('Please fill in your name and email address with a valid email.');
      invalidInput.focus();
      return;
    }
    goToStep(3);
  }

  function createDemoTicket() {
    if (!validation?.quote) {
      setToastMessage(validation?.error || 'Your ticket choices must be validated before proceeding.');
      goToStep(0);
      return;
    }
    setBookingRef(`BBT-${Math.floor(100000 + Math.random() * 900000)}`);
    goToStep(4);
  }

  const dismissToast = useCallback(() => setToastMessage(''), []);

  return (
    <Layout current="booking">
      <section className="booking-section">
        <div className="booking-title-block">
          <h1>Book Your Tickets</h1>
          <p>Reserve the best seats in the house with our interactive seat picker.</p>
        </div>
        <ProgressBar currentStep={step} />
        <form className="booking-form" ref={formRef} onSubmit={(event) => event.preventDefault()}>
          {step === 0 && (
            <TicketSelection
              selections={selections}
              selection={selectedSelection}
              date={date}
              time={time}
              screen={screen}
              tickets={tickets}
              totalTickets={totalTickets}
              showtimes={showtimes}
              dates={availableDates}
              selectionLoading={selectionLoading}
              selectionError={selectionError}
              showtimeLoading={Boolean(detailMovieId != null && (!currentMovieDetail || currentMovieDetail.loading))}
              showtimeError={currentMovieDetail?.error}
              pricing={pricing}
              pricingLoading={pricingLoading}
              pricingError={pricingError}
              validation={validation}
              validationLoading={validationLoading}
              onSelectionChange={changeSelection}
              onDateChange={changeDate}
              onTimeChange={changeTime}
              onTicketChange={changeTicketCount}
              onContinue={continueFromTickets}
            />
          )}
          {step === 1 && (
            <SeatSelection
              selectedSeats={selectedSeats}
              totalTickets={totalTickets}
              onToggleSeat={toggleSeat}
              onBack={() => goToStep(0)}
              onContinue={continueFromSeats}
            />
          )}
          {step === 2 && (
            <GuestDetails
              customer={customer}
              onChange={updateCustomer}
              onBack={() => goToStep(1)}
              onContinue={continueFromGuestDetails}
            />
          )}
          {step === 3 && (
            <DemoPayment
              onBack={() => goToStep(2)}
              onConfirm={createDemoTicket}
              onPaymentInput={() => setToastMessage('Demo only: payment details are not processed. You can continue without entering them.')}
            />
          )}
          {step === 4 && (
            <BookingConfirmation
              movie={selectedSelection}
              date={date}
              time={time}
              screen={screen}
              selectedSeats={selectedSeats}
              totalTickets={totalTickets}
              totalPrice={validation?.quote?.total || 0}
              customer={customer}
              bookingRef={bookingRef}
            />
          )}
        </form>
        <Toast message={toastMessage} onDismiss={dismissToast} />
      </section>
    </Layout>
  );
}
