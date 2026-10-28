import { useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  CINEMA_SEAT_CAPACITY,
  createCheckoutPayload,
  getBookingSelections,
  getSelectionDateAvailability,
  getTicketPricing,
  isShowtimeIdForDate,
  selectionDisplayLabel,
  selectionKey,
  validateCheckout,
} from '../shared/bookingApi';
import { movieSlug } from '../../movies';
import { getFirstAvailableDate } from './bookingDates';
import { BookingLoader, StepHeader } from './BookingStepComponents';

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
    return {
      isoDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      label: formatter.format(date).replace(/,/g, ''),
      weekday: weekdayNames[date.getDay()],
    };
  });
}

function createCalendarDate(isoDate) {
  if (!isoDate) return null;
  const parsedDate = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== isoDate) return null;
  return {
    isoDate,
    weekday: weekdayNames[parsedDate.getUTCDay()],
    label: new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(parsedDate).replace(/,/g, ''),
  };
}

function findDate(dates, dayParam) {
  const query = dayParam.trim().toLowerCase();
  return dates.find((date) => date.isoDate === query)
    || dates.find((date) => date.label.toLowerCase() === query)
    || dates.find((date) => date.weekday.toLowerCase() === query || date.weekday.slice(0, 3).toLowerCase() === query)
    || dates[0];
}

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

function getInitialScreening(initialData, params) {
  const storedScreening = initialData.showtime;
  const storedDate = storedScreening?.date || initialData.date;
  if (isShowtimeIdForDate(storedScreening?.showtimeId, storedDate)) {
    return { date: storedDate, showtimeId: storedScreening.showtimeId };
  }

  const date = params.get('date');
  const showtimeId = params.get('showtimeId');
  return isShowtimeIdForDate(showtimeId, date) ? { date, showtimeId } : null;
}

export function TicketSelection({ initialData = {}, onNext, onToast }) {
  const dates = useMemo(() => createUpcomingDates(), []);
  const params = useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search),
    [],
  );
  const [dateOverride, setDateOverride] = useState(() => (
    createCalendarDate(initialData.date)?.isoDate
    || createCalendarDate(params.get('date'))?.isoDate
    || createUpcomingDates()[0].isoDate
  ));
  const dateOverrideRef = useRef(dateOverride);
  const [selectionState, setSelectionState] = useState(() => ({
    selections: initialData.selection ? [initialData.selection] : [],
    loading: true,
    error: null,
    date: dateOverride,
  }));
  const [selectedKey, setSelectedKey] = useState(() => (
    initialData.selection ? selectionKey(initialData.selection) : ''
  ));
  const [selectedScreening, setSelectedScreening] = useState(() => getInitialScreening(initialData, params));
  const [tickets, setTickets] = useState(() => initialData.tickets || {});
  const [showtimeState, setShowtimeState] = useState({
    requestKey: '', showtimesByDate: {}, error: null,
  });
  const [pricingState, setPricingState] = useState({
    requestKey: '', pricing: null, loading: false, error: null,
  });
  const [validationState, setValidationState] = useState({
    requestKey: '', quote: null, loading: false, error: null,
  });
  const [calendarAvailabilityState, setCalendarAvailabilityState] = useState({
    requestKey: '', availability: null, loading: false, error: null,
  });
  const [calendarAvailabilityRefresh, setCalendarAvailabilityRefresh] = useState(0);
  const initialSelectionResolvedRef = useRef(Boolean(initialData.selection));
  const calendarAvailabilityCacheRef = useRef(new Map());
  const pendingFirstAvailableDateRef = useRef('');

  const selectionStateMatchesDate = selectionState.date === dateOverride;
  const selections = selectionState.selections;
  const selectionLoading = !selectionStateMatchesDate || selectionState.loading;
  const selectionError = selectionStateMatchesDate ? selectionState.error : null;
  const selectedSelection = selections.find((item) => selectionKey(item) === selectedKey) || null;
  const selectedSelectionRef = useRef(selectedSelection);
  const calendarAvailabilityRequestKey = selectedSelection ? selectionKey(selectedSelection) : '';
  const calendarAvailability = calendarAvailabilityState.requestKey === calendarAvailabilityRequestKey
    ? calendarAvailabilityState.availability
    : null;
  const calendarAvailabilityLoading = Boolean(calendarAvailabilityRequestKey && (
    calendarAvailabilityState.requestKey !== calendarAvailabilityRequestKey
    || calendarAvailabilityState.loading
  ));
  const calendarAvailabilityError = calendarAvailabilityState.requestKey === calendarAvailabilityRequestKey
    ? calendarAvailabilityState.error
    : null;
  const currentShowtimeState = showtimeState.requestKey === calendarAvailabilityRequestKey
    ? showtimeState
    : null;
  const showtimesByDate = currentShowtimeState?.showtimesByDate || {};
  const showtimeLoading = Boolean(selectedSelection && !currentShowtimeState);
  const showtimeError = currentShowtimeState?.error || null;
  const currentDate = createCalendarDate(dateOverride)
    || createCalendarDate(findDate(dates, params.get('day') || '')?.isoDate)
    || dates[0];
  const date = currentDate?.isoDate || '';
  const day = currentDate?.weekday || '';
  const showtimes = selectedSelection ? showtimesByDate[date] || [] : [];
  const selectedShowtime = selectedScreening?.date === date
    ? showtimes?.find((slot) => slot.showtimeId === selectedScreening.showtimeId) || null
    : null;
  const time = selectedShowtime?.time || '';
  const totalTickets = Object.values(tickets).reduce((total, count) => total + count, 0);
  const pricingRequestKey = selectedSelection && time
    ? `${selectionKey(selectedSelection)}|${date}|${day}|${time}`
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
  const ticketTotal = pricing?.ticketTiers.reduce(
    (total, tier) => total + tier.price * (tickets[tier.id] || 0),
    0,
  ) || 0;
  const displayedTotal = validation?.quote?.total ?? ticketTotal;

  useEffect(() => {
    selectedSelectionRef.current = selectedSelection;
  }, [selectedSelection]);

  useEffect(() => {
    const selection = selectedSelectionRef.current;
    if (!selection || !calendarAvailabilityRequestKey) return undefined;

    const requestKey = calendarAvailabilityRequestKey;
    const applyFirstAvailableDate = (availableShowtimes) => {
      if (pendingFirstAvailableDateRef.current !== requestKey) return;
      pendingFirstAvailableDateRef.current = '';

      const firstAvailableDate = getFirstAvailableDate(dates, availableShowtimes);
      if (!firstAvailableDate || firstAvailableDate === dateOverrideRef.current) return;

      dateOverrideRef.current = firstAvailableDate;
      setDateOverride(firstAvailableDate);
      setSelectedScreening(null);
      setPricingState({ requestKey: '', pricing: null, loading: false, error: null });
      setValidationState({ requestKey: '', quote: null, loading: false, error: null });
    };

    const cachedAvailability = calendarAvailabilityCacheRef.current.get(requestKey);
    if (cachedAvailability) {
      setCalendarAvailabilityState({
        requestKey, availability: cachedAvailability.availability, loading: false, error: null,
      });
      setShowtimeState({
        requestKey, showtimesByDate: cachedAvailability.showtimesByDate, error: null,
      });
      applyFirstAvailableDate(cachedAvailability.showtimesByDate);
      return undefined;
    }

    const controller = new AbortController();
    setCalendarAvailabilityState({ requestKey, availability: null, loading: true, error: null });
    let showtimesReady = false;
    let availableShowtimes = {};
    getSelectionDateAvailability(selection, dates, controller.signal, (showtimesByDate) => {
      if (controller.signal.aborted) return;
      showtimesReady = true;
      availableShowtimes = showtimesByDate;
      setShowtimeState({ requestKey, showtimesByDate, error: null });
      applyFirstAvailableDate(showtimesByDate);
    })
      .then((availability) => {
        if (controller.signal.aborted) return;
        const result = { availability, showtimesByDate: availableShowtimes };
        calendarAvailabilityCacheRef.current.set(requestKey, result);
        setCalendarAvailabilityState({ requestKey, availability, loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          if (!showtimesReady) {
            setShowtimeState({ requestKey, showtimesByDate: {}, error: error.message });
          }
          setCalendarAvailabilityState({
            requestKey, availability: null, loading: false, error: error.message,
          });
        }
      });
    return () => controller.abort();
  }, [calendarAvailabilityRequestKey, dates, calendarAvailabilityRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    getBookingSelections(controller.signal, dateOverride)
      .then(({ selections: items, error: warning }) => {
        setSelectionState({
          selections: items, loading: false, error: warning, date: dateOverride,
        });
        if (initialSelectionResolvedRef.current) return;
        initialSelectionResolvedRef.current = true;

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
          && [item.title, item.slug, item.id, item.movieId, movieSlug(item)]
            .some((value) => String(value).toLowerCase() === requestedMovie)
        ));
        if (requested) setSelectedKey(selectionKey(requested));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setSelectionState({ selections: [], loading: false, error: error.message, date: dateOverride });
      });
    return () => controller.abort();
  }, [params, dateOverride]);

  useEffect(() => {
    const selection = selectedSelectionRef.current;
    if (!pricingRequestKey || !selection) return undefined;

    const controller = new AbortController();
    const requestKey = pricingRequestKey;
    getTicketPricing(selection, day, time, controller.signal)
      .then((nextPricing) => {
        if (controller.signal.aborted) return;
        setPricingState({ requestKey, pricing: nextPricing, loading: false, error: null });
        setTickets((current) => {
          const tierIds = new Set(nextPricing.ticketTiers.map((tier) => String(tier.id)));
          return Object.fromEntries(
            Object.entries(current).filter(([tierId]) => tierIds.has(tierId)),
          );
        });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setPricingState({ requestKey, pricing: null, loading: false, error: error.message });
        }
      });
    return () => controller.abort();
  }, [pricingRequestKey, day, time]);

  useEffect(() => {
    const selection = selectedSelectionRef.current;
    if (!checkoutRequestKey || !pricing || !selection) return undefined;

    const controller = new AbortController();
    const requestKey = checkoutRequestKey;
    const payload = createCheckoutPayload(selection, day, time, tickets);
    validateCheckout(payload, controller.signal)
      .then((quote) => {
        if (!controller.signal.aborted) {
          setValidationState({ requestKey, quote, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setValidationState({ requestKey, quote: null, loading: false, error: error.message });
        }
      });
    return () => controller.abort();
  }, [checkoutRequestKey, pricing, day, time, tickets]);

  function changeSelection(value) {
    setSelectedKey(value);
    pendingFirstAvailableDateRef.current = value;
    setSelectedScreening(null);
    setTickets({});
    setPricingState({ requestKey: '', pricing: null, loading: false, error: null });
    setValidationState({ requestKey: '', quote: null, loading: false, error: null });
  }

  function changeDate(isoDate) {
    pendingFirstAvailableDateRef.current = '';
    dateOverrideRef.current = isoDate;
    setDateOverride(isoDate);
    setSelectedScreening(null);
    setPricingState({ requestKey: '', pricing: null, loading: false, error: null });
    setValidationState({ requestKey: '', quote: null, loading: false, error: null });
  }

  function changeTime(showtime) {
    if (showtime.showtimeId === selectedScreening?.showtimeId && date === selectedScreening?.date) return;

    setSelectedScreening({ date, showtimeId: showtime.showtimeId });
    setTickets({});
    setPricingState({ requestKey: '', pricing: null, loading: false, error: null });
    setValidationState({ requestKey: '', quote: null, loading: false, error: null });
  }

  function changeTicketCount(tierId, amount) {
    if (amount > 0 && totalTickets >= 10) {
      onToast('Maximum of 10 tickets allowed.');
      return;
    }
    if (amount < 0 && !tickets[tierId]) return;

    setTickets((current) => ({
      ...current,
      [tierId]: Math.max(0, (current[tierId] || 0) + amount),
    }));
    setValidationState({ requestKey: '', quote: null, loading: false, error: null });
  }

  function continueToSeats() {
    if (!selectedSelection) {
      onToast('Please choose a film or special offer before selecting seats.');
      return;
    }
    if (!selectedShowtime || selectedScreening?.date !== date) {
      onToast('Please choose an available showtime before selecting seats.');
      return;
    }
    if (!totalTickets) {
      onToast('Please select at least one ticket before choosing seats.');
      return;
    }
    if (validationLoading) {
      onToast('Your ticket choices are still being confirmed. Please wait and try again.');
      return;
    }
    if (!validation?.quote) {
      onToast(validation?.error || 'Your ticket choices could not be confirmed. Please review them and try again.');
      return;
    }

    onNext({
      selection: selectedSelection,
      date,
      showtime: { ...selectedShowtime, date },
      tickets,
      quote: validation.quote,
      seats: [],
    });
  }

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
        <select
          id="booking-movie"
          className="form-control"
          value={selectedSelection ? selectionKey(selectedSelection) : ''}
          onChange={(event) => changeSelection(event.target.value)}
          required
        >
          <option value="" disabled>-- Choose a Film or Special Offer --</option>
          <optgroup label="Movies">
            {selections.filter((item) => item.type === 'movie').map((item) => (
              <option value={selectionKey(item)} key={selectionKey(item)}>{item.label}</option>
            ))}
          </optgroup>
          <optgroup label="Special Offers">
            {selections.filter((item) => item.type === 'offer').map((item) => (
              <option value={selectionKey(item)} key={selectionKey(item)}>{selectionDisplayLabel(item)}</option>
            ))}
          </optgroup>
        </select>
        {selectionLoading && <BookingLoader>Loading films and special offers...</BookingLoader>}
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
            minDate={toCalendarDate(dates[0]?.isoDate)}
            maxDate={toCalendarDate(dates.at(-1)?.isoDate)}
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
              if (selectedDate) changeDate(toIsoDate(selectedDate));
            }}
            disabled={!selectedSelection}
            required
          />
          {calendarAvailabilityLoading && (
            <BookingLoader>Checking showtimes and seat availability...</BookingLoader>
          )}
          {calendarAvailabilityError && (
            <p className="form-notice" role="alert">
              Could not load date availability: {calendarAvailabilityError}{' '}
              <button
                className="booking-calendar-retry"
                type="button"
                onClick={() => {
                  if (calendarAvailabilityRequestKey) {
                    calendarAvailabilityCacheRef.current.delete(calendarAvailabilityRequestKey);
                  }
                  setCalendarAvailabilityRefresh((current) => current + 1);
                }}
              >
                Retry
              </button>
            </p>
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
            {!selectedSelection
              ? <span className="showtime-placeholder">Select a film or offer to see available showtimes.</span>
              : showtimeLoading
                ? <BookingLoader className="showtime-loading">Loading showtimes...</BookingLoader>
                : showtimeError
                  ? <span className="form-notice" role="alert">{showtimeError}</span>
                  : showtimes?.length
                    ? showtimes.map((showtime) => (
                      <button
                        className={`time-chip ${selectedShowtime?.showtimeId === showtime.showtimeId ? 'active' : ''}`}
                        type="button"
                        aria-pressed={selectedShowtime?.showtimeId === showtime.showtimeId}
                        key={showtime.showtimeId}
                        onClick={() => changeTime(showtime)}
                      >
                        <span className="time-chip-time">{showtime.time}</span>
                        <span className="time-chip-screen">Screen {showtime.screen}</span>
                      </button>
                    ))
                    : <span className="showtime-placeholder">
                      {selectedSelection.type === 'offer'
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
          && (!selectedSelection || showtimes?.length > 0)
          && (
            <p className="showtime-placeholder" role="status">
              {selectedSelection
                ? 'Select a showtime to view ticket types and prices.'
                : 'Choose a film and showtime to view ticket types and prices.'}
            </p>
          )}
        {pricingLoading && <BookingLoader>Loading ticket prices...</BookingLoader>}
        {pricingError && <p className="form-notice" role="alert">{pricingError}</p>}
        {!pricingLoading && !pricingError && selectedSelection && time && !pricing?.ticketTiers.length
          && <p className="form-notice" role="status">No ticket types are available for this showtime.</p>}
        {pricing?.ticketTiers.map((tier) => (
          <div className="ticket-row" key={tier.id}>
            <div className="ticket-info"><h4>{tier.label}</h4><span>{tier.description}</span></div>
            <div className="ticket-counter">
              <strong>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: tier.currency || 'GBP' }).format(tier.price)}</strong>
              <button className="counter-btn" type="button" aria-label={`Decrease ${tier.label}`} onClick={() => changeTicketCount(tier.id, -1)}>−</button>
              <span className="counter-val" aria-live="polite">{tickets[tier.id] || 0}</span>
              <button className="counter-btn" type="button" aria-label={`Increase ${tier.label}`} onClick={() => changeTicketCount(tier.id, 1)}>+</button>
            </div>
          </div>
        ))}
        {validation?.error && <p className="form-notice" role="alert">{validation.error}</p>}
        {validationLoading && <BookingLoader>Checking ticket total...</BookingLoader>}
      </div>
      <div className="booking-subtotal-bar">
        <div className="subtotal-item booking-subtotal-values">
          <div className="subtotal-metric">
            <span>Selected:</span>
            <strong>{totalTickets} Seat{totalTickets === 1 ? '' : 's'}</strong>
          </div>
          <div className="subtotal-metric">
            <span>Total:</span>
            <strong>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(displayedTotal)}</strong>
          </div>
        </div>
      </div>
      <button type="button" className="form-button next booking-continue-button" onClick={continueToSeats}>Select Seats</button>
    </fieldset>
  );
}
