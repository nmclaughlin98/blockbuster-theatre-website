import styles from './BookingPage.module.css';
import { useEffect, useState } from 'react';
import { cognitoAuth, getCognitoCustomer } from '../../../auth/cognitoAuth';
import { CenteredHeadingBlock, Layout } from '../../shared';
import { Toast } from '../../shared/Toast/Toast';
import { useToast } from '../../shared/Toast/useToast';
import { BookingConfirmation } from './BookingConfirmation';
import { GuestDetails } from './GuestDetails';
import { PaymentStep } from './PaymentStep';
import { BookingLoader, ProgressBar } from './BookingStepComponents';
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

export function Booking({ authClient = cognitoAuth } = {}) {
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState(initialBooking);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [skipGuestInfo, setSkipGuestInfo] = useState(false);
  const { toast, setToastMessage } = useToast();

  useEffect(() => {
    document.title = 'Blockbuster Theatre - Book Now';
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSignedInCustomer() {
      try {
        const session = await authClient.fetchAuthSession();
        const customer = getCognitoCustomer(session);
        const isSignedIn = Boolean(
          session.tokens?.accessToken
          && customer.firstName
          && customer.surname
          && customer.email,
        );

        if (active && isSignedIn) {
          setBooking((current) => ({ ...current, customer }));
          setSkipGuestInfo(true);
        }
      } catch {
        if (active) {
          setToastMessage('We could not verify your account. Enter your details to continue.');
        }
      } finally {
        if (active) setIsAuthResolved(true);
      }
    }

    loadSignedInCustomer();
    return () => { active = false; };
  }, [authClient, setToastMessage]);

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
    setStep((current) => (
      skipGuestInfo && current === 3 ? 1 : Math.max(0, current - 1)
    ));
  }

  return (
    <Layout className={styles.root} current="booking">
      <section className="booking-section">
        <CenteredHeadingBlock
          title="Book Your Tickets"
          description="Reserve the best seats in the house with our interactive seat picker."
        />
        {isAuthResolved ? <ProgressBar currentStep={step} skipGuestInfo={skipGuestInfo} /> : null}
        <form className="booking-form" onSubmit={(event) => event.preventDefault()}>
          {!isAuthResolved && <BookingLoader>Checking your account...</BookingLoader>}
          {step === 0 && (
            isAuthResolved && <TicketSelection
              initialData={booking}
              onNext={(ticketData) => navigateToStep(1, ticketData)}
              onToast={setToastMessage}
            />
          )}
          {step === 1 && (
            isAuthResolved && <SeatSelection
              initialData={booking}
              onBack={goBack}
              onNext={(seats) => navigateToStep(skipGuestInfo ? 3 : 2, { seats })}
              onToast={setToastMessage}
            />
          )}
          {step === 2 && !skipGuestInfo && isAuthResolved && (
            <GuestDetails
              initialData={booking.customer}
              onBack={goBack}
              onNext={(customer) => navigateToStep(3, { customer })}
              onToast={setToastMessage}
            />
          )}
          {step === 3 && (
            isAuthResolved && <PaymentStep
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
            isAuthResolved && <BookingConfirmation
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
