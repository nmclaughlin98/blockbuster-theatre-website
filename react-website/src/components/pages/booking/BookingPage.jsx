import styles from './BookingPage.module.css';
import { useEffect, useState } from 'react';
import { cognitoAuth, getCognitoCustomer } from '../../../auth/cognitoAuth';
import { CenteredHeadingBlock, Layout } from '../../shared';
import { Toast } from '../../shared/Toast/Toast';
import { useToast } from '../../shared/Toast/useToast';
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
  const { toast, setToastMessage } = useToast();

  const [signedInCustomer, setSignedInCustomer] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadSignedInCustomer() {
      try {
        const session = await cognitoAuth.fetchAuthSession();
        const customer = getCognitoCustomer(session);
        const complete = session.tokens?.accessToken
          && customer.firstName && customer.surname && customer.email;
        if (active && complete) {
          setSignedInCustomer(customer);
          setBooking((current) => ({ ...current, customer }));
        }
      } catch {
        // Not signed in or Cognito unconfigured: fall back to guest details.
      }
    }
    loadSignedInCustomer();
    return () => { active = false; };
  }, []);

  const skipGuestInfo = Boolean(signedInCustomer);

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
    setStep((current) => (skipGuestInfo && current === 3 ? 1 : Math.max(0, current - 1)));
  }

  return (
    <Layout className={styles.root} current="booking">
      <section className="booking-section">
        <CenteredHeadingBlock
          title="Book Your Tickets"
          description="Reserve the best seats in the house with our interactive seat picker."
        />
        <ProgressBar currentStep={step} skipGuestInfo={skipGuestInfo} />
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
              onNext={(seats) => navigateToStep(skipGuestInfo ? 3 : 2, { seats })}
              onToast={setToastMessage}
            />
          )}
          {step === 2 && !skipGuestInfo && (
            <GuestDetails
              initialData={booking.customer}
              onBack={goBack}
              onNext={(customer) => navigateToStep(3, { customer })}
              onToast={setToastMessage}
            />
          )}
          {step === 3 && (
            <PaymentStep
              skipGuestInfo={skipGuestInfo}
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
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToastMessage('')}
        />
      </section>
    </Layout>
  );
}
