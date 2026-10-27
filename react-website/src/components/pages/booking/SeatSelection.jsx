import { useEffect, useState } from 'react';
import { asset } from '../../shared';
import { getBookedSeats } from '../shared/bookingApi';
import { StepActions, StepHeader } from './BookingStepComponents';

const accessibleSeats = new Set(['A1', 'A5', 'A6', 'A10']);

export function SeatSelection({ initialData, onBack, onNext, onToast }) {
  const [selectedSeats, setSelectedSeats] = useState(() => initialData.seats || []);
  const [hoveredSeat, setHoveredSeat] = useState(null);
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
  const totalTickets = Object.values(initialData.tickets || {})
    .reduce((total, count) => total + count, 0);

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
    if (event.target.closest('.seat-spacer')) {
      setHoveredSeat(null);
      return;
    }

    updateSeatTooltip(seatId, event.clientX, event.clientY);
  }

  function toggleSeat(seatId) {
    if (bookedSeats.includes(seatId) || bookedSeatsLoading || bookedSeatsError) return;
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats((current) => current.filter((seat) => seat !== seatId));
      return;
    }
    if (selectedSeats.length >= totalTickets) {
      onToast(`You can select up to ${totalTickets} seat${totalTickets === 1 ? '' : 's'}.`);
      return;
    }
    setSelectedSeats((current) => [...current, seatId]);
  }

  function continueToGuestDetails() {
    if (!requestKey || bookedSeatsLoading || bookedSeatsError) {
      onToast(bookedSeatsError || 'Please wait for seat availability to load before continuing.');
      return;
    }
    if (selectedSeats.length !== totalTickets) {
      onToast('Please pick all seats to continue.');
      return;
    }
    onNext(selectedSeats);
  }

  return (
    <fieldset className="active" data-step="1">
      <StepHeader
        title="Step 2: Reserve Your Seats"
        description={`Please choose exactly ${totalTickets} seat${totalTickets === 1 ? '' : 's'} on the map below.`}
      />
      {bookedSeatsLoading && <p className="showtime-placeholder" role="status">Checking seat availability...</p>}
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
                        disabled={isBooked || bookedSeatsLoading || Boolean(bookedSeatsError)}
                        aria-label={`Seat ${seatId}${isAccessible ? ', accessible' : ''}${isBooked ? ', booked' : ''}${isSelected ? ', selected' : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => toggleSeat(seatId)}
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
        continueDisabled={!requestKey || bookedSeatsLoading || Boolean(bookedSeatsError) || selectedSeats.length !== totalTickets}
      />
    </fieldset>
  );
}
