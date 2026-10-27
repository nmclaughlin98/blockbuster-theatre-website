import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '../../shared';
import { Toast } from '../../shared/Toast';
import {
  getBookingSelections,
  createCheckoutPayload,
  createGuestBookingPayload,
  createGuestBooking,
  getBookedSeats,
  getMovieDetailIdForSelection,
  getMovieDetail,
  getSelectionShowtimes,
  getSelectionDateAvailability,
  getTicketPricing,
  isShowtimeIdForDate,
  selectionKey,
  validateCheckout,
} from '../shared/bookingApi';
import { BookingConfirmation } from './BookingConfirmation';
import { GuestDetails } from './GuestDetails';
import { PaymentStep } from './PaymentStep';
import { ProgressBar } from './BookingStepComponents';
import { SeatSelection } from './SeatSelection';
import { TicketSelection } from './TicketSelection';

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

function findDate(dates, dayParam) {
  const query = dayParam.trim().toLowerCase();
  return dates.find((date) => date.isoDate === query)
    || dates.find((date) => date.label.toLowerCase() === query)
    || dates.find((date) => date.weekday.toLowerCase() === query || date.weekday.slice(0, 3).toLowerCase() === query)
    || dates[0];
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

export function Booking() {
  const [selectionState, setSelectionState] = useState({
    selections: [], loading: true, error: null, date: '',
  });
  const [step, setStep] = useState(0);
  const [selectedKey, setSelectedKey] = useState('');
  const [dateOverride, setDateOverride] = useState(() => {
    const requestedDate = new URLSearchParams(window.location.search).get('date');
    return createCalendarDate(requestedDate)?.isoDate || createUpcomingDates()[0].isoDate;
  });
  const [selectedScreening, setSelectedScreening] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const date = params.get('date');
    const showtimeId = params.get('showtimeId');
    return isShowtimeIdForDate(showtimeId, date) ? { date, showtimeId } : null;
  });
  const [tickets, setTickets] = useState({});
  const [movieDetailState, setMovieDetailState] = useState({ movie: null, loading: false, error: null });
  const [pricingState, setPricingState] = useState({ requestKey: '', pricing: null, loading: false, error: null });
  const [validationState, setValidationState] = useState({ requestKey: '', quote: null, loading: false, error: null });
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [bookedSeatState, setBookedSeatState] = useState({
    requestKey: '', bookedSeats: [], loading: false, error: null,
  });
  const [bookedSeatsRefresh, setBookedSeatsRefresh] = useState(0);
  const [calendarAvailabilityState, setCalendarAvailabilityState] = useState({
    requestKey: '', availability: null, loading: false, error: null,
  });
  const [calendarAvailabilityRefresh, setCalendarAvailabilityRefresh] = useState(0);
  const [customer, setCustomer] = useState({ firstName: '', surname: '', email: '' });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const bookingSubmittingRef = useRef(false);
  const initialSelectionResolvedRef = useRef(false);
  const calendarAvailabilityCacheRef = useRef(new Map());
  const formRef = useRef(null);
  const dates = useMemo(() => createUpcomingDates(), []);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const selectionStateMatchesDate = selectionState.date === dateOverride;
  const selections = selectionStateMatchesDate ? selectionState.selections : [];
  const selectionLoading = !selectionStateMatchesDate || selectionState.loading;
  const selectionError = selectionStateMatchesDate ? selectionState.error : null;
  const selectedSelection = selections.find((item) => selectionKey(item) === selectedKey) || null;
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
  const detailMovieId = getMovieDetailIdForSelection(selectedSelection);
  const detailRequestKey = selectedSelection
    ? `${selectionKey(selectedSelection)}|${dateOverride}`
    : '';
  const currentMovieDetail = detailMovieId != null
    && movieDetailState.requestKey === detailRequestKey
    ? movieDetailState
    : null;
  const currentDate = createCalendarDate(dateOverride)
    || createCalendarDate(findDate(dates, params.get('day') || '')?.isoDate)
    || dates[0];
  const date = currentDate?.isoDate || '';
  const showtimes = selectedSelection
    ? getSelectionShowtimes(selectedSelection, currentMovieDetail?.movie, date)
    : null;
  const selectedShowtime = selectedScreening?.date === date
    ? showtimes?.find((slot) => slot.showtimeId === selectedScreening.showtimeId) || null
    : null;
  const time = selectedShowtime?.time || '';
  const screen = selectedShowtime?.screen || '';
  const day = currentDate?.weekday || '';
  const bookedSeatsRequestKey = selectedShowtime && date
    ? JSON.stringify([selectedScreening.showtimeId, selectedScreening.date])
    : '';
  const bookedSeatsStateKey = bookedSeatsRequestKey
    ? JSON.stringify([bookedSeatsRequestKey, bookedSeatsRefresh])
    : '';
  const bookedSeats = bookedSeatState.requestKey === bookedSeatsStateKey
    ? bookedSeatState.bookedSeats
    : [];
  const bookedSeatsLoading = Boolean(bookedSeatsRequestKey && (
    bookedSeatState.requestKey !== bookedSeatsStateKey || bookedSeatState.loading
  ));
  const bookedSeatsError = bookedSeatState.requestKey === bookedSeatsStateKey
    ? bookedSeatState.error
    : null;
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
  useEffect(() => {
    if (!selectedSelection) return undefined;

    const requestKey = selectionKey(selectedSelection);
    const cachedAvailability = calendarAvailabilityCacheRef.current.get(requestKey);
    if (cachedAvailability) {
      setCalendarAvailabilityState({
        requestKey, availability: cachedAvailability, loading: false, error: null,
      });
      return undefined;
    }

    const controller = new AbortController();
    setCalendarAvailabilityState({
      requestKey, availability: null, loading: true, error: null,
    });
    getSelectionDateAvailability(selectedSelection, dates, controller.signal)
      .then((availability) => {
        if (controller.signal.aborted) return;
        calendarAvailabilityCacheRef.current.set(requestKey, availability);
        setCalendarAvailabilityState({
          requestKey, availability, loading: false, error: null,
        });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setCalendarAvailabilityState({
            requestKey, availability: null, loading: false, error: error.message,
          });
        }
      });
    return () => controller.abort();
  }, [selectedSelection, dates, calendarAvailabilityRefresh]);
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
          && [item.title, item.slug, item.id, item.movieId]
            .some((value) => String(value).toLowerCase() === requestedMovie)
        ));
        if (requested) setSelectedKey(selectionKey(requested));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setSelectionState({
          selections: [], loading: false, error: error.message, date: dateOverride,
        });
      });
    return () => controller.abort();
  }, [params, dateOverride]);

  useEffect(() => {
    const movieId = getMovieDetailIdForSelection(selectedSelection);
    if (movieId == null) return undefined;

    const controller = new AbortController();
    const requestKey = detailRequestKey;
    getMovieDetail(movieId, controller.signal, date)
      .then((movie) => setMovieDetailState({ requestKey, movie, loading: false, error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setMovieDetailState({ requestKey, movie: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [selectedSelection, detailRequestKey, date]);

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

  useEffect(() => {
    if (!bookedSeatsRequestKey || !selectedSelection) return undefined;

    const controller = new AbortController();
    const requestKey = bookedSeatsStateKey;
    getBookedSeats(selectedScreening.showtimeId, selectedScreening.date, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setBookedSeatState({ requestKey, bookedSeats: items, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setBookedSeatState({ requestKey, bookedSeats: [], loading: false, error: error.message });
        }
      });
    return () => controller.abort();
  }, [bookedSeatsRequestKey, bookedSeatsStateKey, selectedSelection, selectedScreening]);

  function changeSelection(value) {
    setSelectedKey(value);
    setSelectedScreening(null);
    setSelectedSeats([]);
    setTickets({});
    setMovieDetailState({ requestKey: '', movie: null, loading: false, error: null });
    setPricingState({ requestKey: '', pricing: null, loading: false, error: null });
    setValidationState({ requestKey: '', quote: null, loading: false, error: null });
  }

  function changeDate(isoDate) {
    setDateOverride(isoDate);
    setSelectedScreening(null);
    setSelectedSeats([]);
    setPricingState({ requestKey: '', pricing: null, loading: false, error: null });
    setValidationState({ requestKey: '', quote: null, loading: false, error: null });
  }

  function changeTime(showtime) {
    if (showtime.showtimeId === selectedScreening?.showtimeId && date === selectedScreening?.date) return;

    setSelectedScreening({ date, showtimeId: showtime.showtimeId });
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
    if (bookedSeats.includes(seatId) || bookedSeatsLoading || bookedSeatsError) return;
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
    if (!selectedShowtime || selectedScreening?.date !== date) {
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
    if (bookedSeatsLoading || bookedSeatsError || !date || !selectedShowtime || selectedScreening?.date !== date) {
      setToastMessage(bookedSeatsError || 'Please wait for seat availability to load before continuing.');
      return;
    }
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

  async function completeGuestBooking() {
    if (bookingSubmittingRef.current) return;
    if (!validation?.quote) {
      goToStep(0);
      setToastMessage(validation?.error || 'Your ticket choices must be validated before proceeding.');
      return;
    }

    if (!selectedShowtime || selectedScreening?.date !== date) {
      goToStep(0);
      setToastMessage('Please choose the screening again before completing your booking.');
      return;
    }
    if (!selectedSeats.length) {
      goToStep(1);
      setToastMessage('Select at least one seat before confirming your booking.');
      return;
    }
    if (bookedSeatsLoading || bookedSeatsError || selectedSeats.some((seat) => bookedSeats.includes(seat))) {
      goToStep(1);
      setToastMessage(bookedSeatsError || 'Seat availability changed. Please choose your seats again.');
      return;
    }

    bookingSubmittingRef.current = true;
    setBookingSubmitting(true);
    try {
      const payload = createGuestBookingPayload({
        showtimeId: selectedScreening.showtimeId,
        date: selectedScreening.date,
        seats: selectedSeats,
        email: customer.email,
        customerName: `${customer.firstName} ${customer.surname}`,
        tickets: Object.entries(tickets)
          .filter(([, quantity]) => quantity > 0)
          .map(([tierId, quantity]) => ({ tierId, quantity })),
        ...(selectedSelection.type === 'offer' ? { offerId: selectedSelection.offerId } : {}),
      });
      const details = await createGuestBooking(payload);
      if (details.showtimeId !== selectedScreening.showtimeId || details.date !== selectedScreening.date) {
        throw new Error('The booking service returned a confirmation for a different screening. Please contact support.');
      }
      setBookingDetails(details);
      setSelectedSeats([]);
      setBookedSeatsRefresh((current) => current + 1);
      goToStep(4);
    } catch (error) {
      if (error.status === 409) {
        setSelectedSeats([]);
        setBookedSeatsRefresh((current) => current + 1);
        goToStep(1);
        setToastMessage('Those seats were just booked by someone else. Availability has been refreshed; please choose again.');
      } else if (error.status === 400) {
        setToastMessage(error.message || 'Please check the booking details and try again.');
      } else if (error.status === 404) {
        setToastMessage('The selected movie, offer, or screening could not be found. Please choose another screening.');
      } else if (error.status >= 500 || !error.status) {
        setToastMessage('We could not reach the booking service. Your booking was not confirmed. Please retry or contact support.');
      } else {
        setToastMessage(`Could not complete your booking: ${error.message}`);
      }
    } finally {
      bookingSubmittingRef.current = false;
      setBookingSubmitting(false);
    }
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
              calendarMinDate={dates[0]?.isoDate}
              calendarMaxDate={dates.at(-1)?.isoDate}
              calendarAvailability={calendarAvailability}
              calendarAvailabilityLoading={calendarAvailabilityLoading}
              calendarAvailabilityError={calendarAvailabilityError}
              time={time}
              screen={screen}
              selectedShowtimeId={selectedShowtime?.showtimeId || ''}
              tickets={tickets}
              totalTickets={totalTickets}
              showtimes={showtimes}
              dates={dates}
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
              onRetryCalendarAvailability={() => {
                if (calendarAvailabilityRequestKey) {
                  calendarAvailabilityCacheRef.current.delete(calendarAvailabilityRequestKey);
                }
                setCalendarAvailabilityRefresh((current) => current + 1);
              }}
              onTimeChange={changeTime}
              onTicketChange={changeTicketCount}
              onContinue={continueFromTickets}
            />
          )}
          {step === 1 && (
            <SeatSelection
              selectedSeats={selectedSeats}
              totalTickets={totalTickets}
              bookedSeats={bookedSeats}
              bookedSeatsLoading={bookedSeatsLoading}
              bookedSeatsError={bookedSeatsError}
              onRetryBookedSeats={() => setBookedSeatsRefresh((current) => current + 1)}
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
            <PaymentStep
              onBack={() => goToStep(2)}
              onConfirm={completeGuestBooking}
              isSubmitting={bookingSubmitting}
              movieTitle={selectedSelection?.title || 'Selected film'}
              seats={selectedSeats}
              totalAmount={validation?.quote?.total || 0}
              customer={customer}
              date={date}
              time={time}
              screen={screen}
            />
          )}
          {step === 4 && (
            <BookingConfirmation
              movie={selectedSelection}
              time={time}
              screen={screen}
              bookingDetails={bookingDetails}
              customer={customer}
              onToast={setToastMessage}
            />
          )}
        </form>
        <Toast message={toastMessage} onDismiss={dismissToast} />
      </section>
    </Layout>
  );
}
