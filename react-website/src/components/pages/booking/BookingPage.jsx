import { useEffect, useState } from 'react';
import { Layout } from '../../shared';
import { Toast } from '../../shared/Toast';
import { BookingConfirmation } from './BookingConfirmation';
import { GuestDetails } from './GuestDetails';
import { PaymentStep } from './PaymentStep';
import { ProgressBar } from './BookingStepComponents';
import { SeatSelection } from './SeatSelection';
import { TicketSelection } from './TicketSelection';

const initialBooking = {
  selection: null,
  date: '',
  showtime: null,
  tickets: {},
  quote: null,
  seats: [],
  customer: { firstName: '', surname: '', email: '' },
  confirmation: null,
};

export function Booking() {
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState(initialBooking);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    document.title = 'Blockbuster Theatre - Book Now';
  }, []);

  function navigateToStep(nextStep, updates = {}) {
    setBooking((current) => ({ ...current, ...updates }));
    setToastMessage('');
    setStep(nextStep);
    window.requestAnimationFrame(() => {
      document.getElementById('progressbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function handleSeatConflict(message) {
    setBooking((current) => ({ ...current, seats: [] }));
    setToastMessage(message);
    setStep(1);
  }

  function handleTicketIssue(message) {
    setToastMessage(message);
    setStep(0);
  }

  function goBack() {
    setToastMessage('');
    setStep((current) => Math.max(0, current - 1));
  }

  return (
    <Layout current="booking">
      <section className="booking-section">
        <div className="booking-title-block">
          <h1>Book Your Tickets</h1>
          <p>Reserve the best seats in the house with our interactive seat picker.</p>
        </div>
        <ProgressBar currentStep={step} />
        <form className="booking-form" onSubmit={(event) => event.preventDefault()}>
          {step === 0 && (
            <TicketSelection
              initialData={booking}
              onNext={(ticketData) => navigateToStep(1, ticketData)}
              onToast={setToastMessage}
            />
          )}
          {step === 1 && (
            <SeatSelection
              initialData={booking}
              onBack={goBack}
              onNext={(seats) => navigateToStep(2, { seats })}
              onToast={setToastMessage}
            />
          )}
          {step === 2 && (
            <GuestDetails
              initialData={booking.customer}
              onBack={goBack}
              onNext={(customer) => navigateToStep(3, { customer })}
            />
          )}
          {step === 3 && (
            <PaymentStep
              initialData={booking}
              onBack={goBack}
              onNext={(confirmation) => navigateToStep(4, { confirmation })}
              onSeatConflict={handleSeatConflict}
              onTicketIssue={handleTicketIssue}
              onToast={setToastMessage}
            />
          )}
          {step === 4 && (
            <BookingConfirmation
              movie={booking.selection}
              time={booking.showtime?.time}
              screen={booking.showtime?.screen}
              bookingDetails={booking.confirmation}
              customer={booking.customer}
              onToast={setToastMessage}
            />
          )}
        </form>
        <Toast message={toastMessage} onDismiss={() => setToastMessage('')} />
      </section>
    </Layout>
  );
}
