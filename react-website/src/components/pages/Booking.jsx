import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '../shared';
import { PageLoader } from '../shared/PageLoader';
import { Toast } from '../shared/Toast';
import {
  getBookingSelections,
  createCheckoutPayload,
  createSeatBookingPayload,
  createSeatBooking,
  getBookedSeats,
  getBookingMovieId,
  getMovieDetailIdForSelection,
  getMovieDetail,
  getSelectionShowtimeDates,
  getSelectionShowtimes,
  getTicketPricing,
  createBookingConfirmationPayload,
  createBookingConfirmationSubmitter,
  selectionKey,
  sendBookingConfirmation,
  validateCheckout,
} from './bookingApi';
import { BookingConfirmation } from './booking/BookingConfirmation';
import { DemoPayment } from './booking/DemoPayment';
import { GuestDetails } from './booking/GuestDetails';
import { ProgressBar } from './booking/BookingStepComponents';
import { SeatSelection } from './booking/SeatSelection';
import { TicketSelection } from './booking/TicketSelection';

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
  const [selectionState, setSelectionState] = useState({ selections: [], loading: true, error: null });
  const [step, setStep] = useState(0);
  const [selectedKey, setSelectedKey] = useState('');
  const [dateOverride, setDateOverride] = useState(() => new URLSearchParams(window.location.search).get('date') || '');
  const [selectedTime, setSelectedTime] = useState(() => new URLSearchParams(window.location.search).get('time') || '');
  const [selectedScreen, setSelectedScreen] = useState('');
  const [screeningChanged, setScreeningChanged] = useState(false);
  const [tickets, setTickets] = useState({});
  const [movieDetailState, setMovieDetailState] = useState({ movie: null, loading: false, error: null });
  const [pricingState, setPricingState] = useState({ requestKey: '', pricing: null, loading: false, error: null });
  const [validationState, setValidationState] = useState({ requestKey: '', quote: null, loading: false, error: null });
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [confirmedSeats, setConfirmedSeats] = useState([]);
  const [bookedSeatState, setBookedSeatState] = useState({
    requestKey: '', bookedSeats: [], loading: false, error: null,
  });
  const [bookedSeatsRefresh, setBookedSeatsRefresh] = useState(0);
  const [customer, setCustomer] = useState({ firstName: '', surname: '', email: '', phone: '' });
  const [bookingRef, setBookingRef] = useState('');
  const [confirmationSending, setConfirmationSending] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const bookingRefRef = useRef('');
  const bookingSubmittingRef = useRef(false);
  const [submitConfirmation] = useState(
    () => createBookingConfirmationSubmitter(sendBookingConfirmation),
  );
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
  const requestedTimeDate = !params.get('date') && !params.get('day') && requestedTime && selectedSelection
    ? availableDates.find((item) => getSelectionShowtimes(
      selectedSelection,
      currentMovieDetail?.movie,
      item.weekday,
    )?.some((slot) => slot.time === requestedTime))
    : null;
  const requestedDate = params.get('date')
    ? createCalendarDate(params.get('date'))
    : null;
  const currentDate = (dateOverride && createCalendarDate(dateOverride))
    || requestedDate
    || requestedTimeDate
    || createCalendarDate(findDate(availableDates, params.get('day') || '')?.isoDate);
  const date = currentDate?.isoDate || '';
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
  const bookedSeatsRequestKey = selectedSelection && date && time
    ? JSON.stringify([getBookingMovieId(selectedSelection), date, day, time])
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
  const initialShowtimeLoading = Boolean(
    requestedTime
    && !screeningChanged
    && time
    && (pricingLoading || validationLoading),
  );
  const bookingLoading = selectionLoading
    || Boolean(
      !screeningChanged
      && selectedSelection
      && detailMovieId != null
      && (!currentMovieDetail || currentMovieDetail.loading),
    )
    || initialShowtimeLoading;

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

  useEffect(() => {
    if (!bookedSeatsRequestKey || !selectedSelection) return undefined;

    const controller = new AbortController();
    const requestKey = bookedSeatsStateKey;
    getBookedSeats(getBookingMovieId(selectedSelection), date, day, time, controller.signal)
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
  }, [bookedSeatsRequestKey, bookedSeatsStateKey, selectedSelection, date, day, time]);

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

  function changeDate(isoDate) {
    setDateOverride(isoDate);
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
    if (bookedSeatsLoading || bookedSeatsError || !date || !time) {
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

  async function createDemoTicket() {
    if (bookingSubmittingRef.current) return;
    if (!validation?.quote) {
      setToastMessage(validation?.error || 'Your ticket choices must be validated before proceeding.');
      goToStep(0);
      return;
    }

    if (!selectedSeats.length) {
      setToastMessage('Select at least one seat before confirming your booking.');
      goToStep(1);
      return;
    }
    if (bookedSeatsLoading || bookedSeatsError || selectedSeats.some((seat) => bookedSeats.includes(seat))) {
      setToastMessage(bookedSeatsError || 'Seat availability changed. Please choose your seats again.');
      goToStep(1);
      return;
    }

    bookingSubmittingRef.current = true;
    setBookingSubmitting(true);
    try {
      const seatBooking = createSeatBookingPayload(selectedSelection, date, day, time, selectedSeats);
      const bookingDetails = await createSeatBooking(seatBooking);
      const bookedSeatIds = [...selectedSeats];
      const currentBookingRef = bookingDetails?.bookingRef
        || bookingDetails?.bookingId
        || bookingRefRef.current
        || `BBT-${Math.floor(100000 + Math.random() * 900000)}`;
      bookingRefRef.current = currentBookingRef;
      setBookingRef(currentBookingRef);
      setConfirmedSeats(bookedSeatIds);
      setSelectedSeats([]);
      setBookedSeatsRefresh((current) => current + 1);

      const payload = createBookingConfirmationPayload({
        bookingRef: currentBookingRef,
        customer,
        selectedSelection,
        date: currentDate.label,
        time,
        screen,
        selectedSeats: bookedSeatIds,
        totalTickets,
        totalPrice: validation.quote.total,
      });
      await submitConfirmation({
        payload,
        onSendingChange: setConfirmationSending,
        onSuccess: () => goToStep(4),
        onError: () => goToStep(4),
      });
    } catch (error) {
      if (error.status === 409) {
        setSelectedSeats([]);
        setBookedSeatsRefresh((current) => current + 1);
        goToStep(1);
        setToastMessage('Those seats were just booked by someone else. Availability has been refreshed; please choose again.');
      } else {
        setToastMessage(`Could not complete your booking: ${error.message}`);
      }
    } finally {
      bookingSubmittingRef.current = false;
      setBookingSubmitting(false);
    }
  }

  const dismissToast = useCallback(() => setToastMessage(''), []);

  if (bookingLoading) {
    return (
      <Layout current="booking" loading>
        <PageLoader label="Loading booking options" />
      </Layout>
    );
  }

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
            <DemoPayment
              onBack={() => goToStep(2)}
              onConfirm={createDemoTicket}
              isSending={confirmationSending || bookingSubmitting}
              onPaymentInput={() => setToastMessage('Demo only: payment details are not processed. You can continue without entering them.')}
            />
          )}
          {step === 4 && (
            <BookingConfirmation
              movie={selectedSelection}
              date={currentDate?.label || date}
              time={time}
              screen={screen}
              selectedSeats={confirmedSeats}
              totalTickets={totalTickets}
              totalPrice={validation?.quote?.total || 0}
              customer={customer}
              bookingRef={bookingRef}
              onToast={setToastMessage}
            />
          )}
        </form>
        <Toast message={toastMessage} onDismiss={dismissToast} />
      </section>
    </Layout>
  );
}
