import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '../shared';
import { PageLoader } from '../shared/PageLoader';
import { Toast } from '../shared/Toast';
import {
  getBookingSelections,
  createCheckoutPayload,
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
    return { label: formatter.format(date).replace(/,/g, ''), weekday: weekdayNames[date.getDay()] };
  });
}

function findDate(dates, dayParam) {
  const query = dayParam.trim().toLowerCase();
  return dates.find((date) => date.label.toLowerCase() === query)
    || dates.find((date) => date.weekday.toLowerCase() === query || date.weekday.slice(0, 3).toLowerCase() === query)
    || dates[0];
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
  const [confirmationSending, setConfirmationSending] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const bookingRefRef = useRef('');
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

  async function createDemoTicket() {
    if (!validation?.quote) {
      setToastMessage(validation?.error || 'Your ticket choices must be validated before proceeding.');
      goToStep(0);
      return;
    }

    const currentBookingRef = bookingRefRef.current
      || bookingRef
      || `BBT-${Math.floor(100000 + Math.random() * 900000)}`;
    bookingRefRef.current = currentBookingRef;
    if (bookingRef !== currentBookingRef) setBookingRef(currentBookingRef);

    const payload = createBookingConfirmationPayload({
      bookingRef: currentBookingRef,
      customer,
      selectedSelection,
      date,
      time,
      screen,
      selectedSeats,
      totalTickets,
      totalPrice: validation.quote.total,
    });

    await submitConfirmation({
      payload,
      onSendingChange: setConfirmationSending,
      onSuccess: () => goToStep(4),
      onError: () => goToStep(4),
    });
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
              isSending={confirmationSending}
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
              onToast={setToastMessage}
            />
          )}
        </form>
        <Toast message={toastMessage} onDismiss={dismissToast} />
      </section>
    </Layout>
  );
}
