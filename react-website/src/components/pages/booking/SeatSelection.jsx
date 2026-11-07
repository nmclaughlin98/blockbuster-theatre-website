import { useEffect, useRef, useState } from 'react';
import { asset } from '../../shared';
import { getBookedSeats, sortSeatIds } from '../shared/bookingApi';
import { BookingLoader, StepActions, StepHeader } from './BookingStepComponents';

const accessibleSeats = new Set(['A1', 'A5', 'A6', 'A10']);

export function SeatSelection({ initialData, onBack, onNext, onToast }) {
  const [selectedSeats, setSelectedSeats] = useState(() => sortSeatIds(initialData.seats || []));
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const selectedSeatsRef = useRef(selectedSeats);
  const seatGridRef = useRef(null);
  const seatDragRef = useRef(null);
  const [refresh, setRefresh] = useState(0);
  const [bookedSeatState, setBookedSeatState] = useState({
    requestKey: '', bookedSeats: [], loading: false, error: null,
  });

  const showtime = initialData.showtime;
  const date = showtime?.date || initialData.date;
  const showtimeId = showtime?.showtimeId;
  const requestKey = showtimeId && date
    ? JSON.stringify([showtimeId, date, refresh])
    : '';
  const bookedSeats = bookedSeatState.requestKey === requestKey
    ? bookedSeatState.bookedSeats
    : [];
  const bookedSeatsLoading = Boolean(requestKey && (
    bookedSeatState.requestKey !== requestKey || bookedSeatState.loading
  ));
  const bookedSeatsError = bookedSeatState.requestKey === requestKey
    ? bookedSeatState.error
    : null;
  const maxSeats = Object.values(initialData.tickets || {})
    .reduce((total, count) => total + count, 0);
  const seatsRemaining = Math.max(maxSeats - selectedSeats.length, 0);
  const seatsComplete = maxSeats > 0 && selectedSeats.length === maxSeats;
  const seatsOverLimit = selectedSeats.length > maxSeats;
  const selectionStatus = maxSeats === 0
    ? 'Choose ticket quantities before selecting seats.'
    : seatsOverLimit
      ? `Remove ${selectedSeats.length - maxSeats} seat${selectedSeats.length - maxSeats === 1 ? '' : 's'} to continue.`
      : seatsComplete
        ? `✓ ${selectedSeats.length} of ${maxSeats} seat${maxSeats === 1 ? '' : 's'} selected`
        : `Please select ${seatsRemaining} more seat${seatsRemaining === 1 ? '' : 's'}`;

  useEffect(() => {
    if (!requestKey) return undefined;

    const controller = new AbortController();
    getBookedSeats(showtimeId, date, controller.signal)
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
  }, [requestKey, showtimeId, date]);

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

    setHoveredSeat({ seatId, left: Math.max(8, left), top: Math.max(8, top) });
  }

  function handleSeatPointer(seatId, event) {
    if (event.pointerType !== 'mouse') return;
    if (seatDragRef.current?.pointerId === event.pointerId) {
      setHoveredSeat(null);
      return;
    }
    if (event.target.closest('.seat-spacer')) {
      setHoveredSeat(null);
      return;
    }

    updateSeatTooltip(seatId, event.clientX, event.clientY);
  }

  function setSeatSelected(seatId, shouldSelect) {
    if (bookedSeats.includes(seatId) || bookedSeatsLoading || bookedSeatsError) return false;

    const currentSeats = selectedSeatsRef.current;
    const isSelected = currentSeats.includes(seatId);
    if (isSelected === shouldSelect) return true;
    if (shouldSelect && currentSeats.length >= maxSeats) return false;

    const nextSeats = shouldSelect
      ? sortSeatIds([...currentSeats, seatId])
      : currentSeats.filter((seat) => seat !== seatId);
    selectedSeatsRef.current = nextSeats;
    setSelectedSeats(nextSeats);
    return true;
  }

  function toggleSeat(seatId) {
    const shouldSelect = !selectedSeatsRef.current.includes(seatId);
    if (!setSeatSelected(seatId, shouldSelect) && shouldSelect
      && selectedSeatsRef.current.length >= maxSeats) {
      onToast('Maximum number of seats selected.');
      seatDragRef.current.limitNotified = true;
    }
  }

  function startSeatDrag(seatId, event) {
    if (!event.isPrimary || event.button !== 0) return;

    const shouldSelect = !selectedSeatsRef.current.includes(seatId);
    seatDragRef.current = {
      pointerId: event.pointerId,
      shouldSelect,
      visitedSeats: new Set([seatId]),
      limitNotified: false,
    };
    setHoveredSeat(null);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (!setSeatSelected(seatId, shouldSelect) && shouldSelect
      && selectedSeatsRef.current.length >= maxSeats) {
      onToast('Maximum number of seats selected.');
    }
  }

  function continueSeatDrag(event) {
    const drag = seatDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const seatButton = element?.closest('button[data-seat-id]');
    if (!seatButton || !seatGridRef.current?.contains(seatButton)) return;

    const seatId = seatButton.dataset.seatId;
    if (!seatId || drag.visitedSeats.has(seatId)) return;
    drag.visitedSeats.add(seatId);
    if (seatButton.disabled) return;

    if (!setSeatSelected(seatId, drag.shouldSelect)
      && drag.shouldSelect
      && selectedSeatsRef.current.length >= maxSeats
      && !drag.limitNotified) {
      onToast('Maximum number of seats selected.');
      drag.limitNotified = true;
    }
  }

  function finishSeatDrag(event) {
    if (seatDragRef.current?.pointerId === event.pointerId) {
      seatDragRef.current = null;
    }
  }

  function continueToGuestDetails() {
    if (!requestKey || bookedSeatsLoading || bookedSeatsError) {
      onToast(bookedSeatsError || 'Please wait for seat availability to load before continuing.');
      return;
    }
    if (selectedSeats.length !== maxSeats) {
      onToast('Please select all seats to continue.');
      return;
    }
    onNext(sortSeatIds(selectedSeats));
  }

  return (
    <fieldset className="active" data-step="1">
      <StepHeader
        title="Step 2: Choose Your Seats"
        description={(
          <span
            className={`seat-selection-status${seatsComplete ? ' seat-selection-status--complete' : ''}${seatsOverLimit ? ' seat-selection-status--warning' : ''}`}
            role="status"
            aria-live="polite"
          >
            {selectionStatus}
          </span>
        )}
      />
      {bookedSeatsLoading && <BookingLoader>Checking seat availability...</BookingLoader>}
      {bookedSeatsError && (
        <div className="form-notice" role="alert">
          <p>Could not load seat availability: {bookedSeatsError}</p>
          <button
            className="form-button previous"
            type="button"
            onClick={() => setRefresh((current) => current + 1)}
          >
            Retry
          </button>
        </div>
      )}
      <div className="seating-plan">
        <div className="screen-container"><div className="screen" /><div className="screen-text">MAIN CINEMA SCREEN</div></div>
        <div className="seat-legend-container">
          <div className="seat-legend">
            <div className="legend-item"><div className="legend-seat selected-seat" /><span>Selected</span></div>
            <div className="legend-item"><div className="legend-seat" /><span>Available</span></div>
            <div className="legend-item"><div className="legend-seat booked-seat" /><span>Unavailable</span></div>
            <div className="legend-item">
              <div className="legend-seat seat-accessible">
                <img src={asset('assets/images/icons/accessible.png')} alt="" />
              </div>
              <span>Accessible</span>
            </div>
          </div>
        </div>
        <div
          className="seat-grid"
          aria-label="Cinema seating plan"
          ref={seatGridRef}
          onPointerMove={continueSeatDrag}
          onPointerUp={finishSeatDrag}
          onPointerCancel={finishSeatDrag}
          onLostPointerCapture={finishSeatDrag}
        >
          {Array.from({ length: 7 }, (_, rowIndex) => {
            const row = String.fromCharCode(65 + rowIndex);
            return (
              <div className="seat-row" key={row}>
                <span className="row-label">{row}</span>
                {Array.from({ length: row === 'G' ? 11 : 10 }, (_, seatIndex) => {
                  const seatId = `${row}${seatIndex + 1}`;
                  const isBooked = bookedSeats.includes(seatId);
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
                        data-seat-id={seatId}
                        disabled={isBooked || bookedSeatsLoading || Boolean(bookedSeatsError)}
                        aria-label={`Seat ${seatId}${isAccessible ? ', accessible' : ''}${isBooked ? ', booked' : ''}${isSelected ? ', selected' : ''}`}
                        aria-pressed={isSelected}
                        onPointerDown={(event) => startSeatDrag(seatId, event)}
                        onClick={(event) => {
                          if (event.detail === 0) toggleSeat(seatId);
                        }}
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
      <StepActions
        onBack={onBack}
        onContinue={continueToGuestDetails}
        continueLabel="Guest Info"
      />
    </fieldset>
  );
}
