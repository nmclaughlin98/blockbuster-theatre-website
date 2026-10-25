import { useEffect, useRef, useState } from 'react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { StepHeader } from './BookingStepComponents';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function GuestPaymentForm({
  onBack, onConfirm, isSubmitting, isConfigured, stripeLoadError, movieTitle, seats, totalAmount,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [tokenizing, setTokenizing] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  async function createPaymentToken() {
    if (submittingRef.current || isSubmitting) return;
    setError('');

    if (!isConfigured || !stripe || !elements) {
      setError('Secure card payment is unavailable. Please try again later.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Enter your card details before continuing.');
      return;
    }

    submittingRef.current = true;
    setTokenizing(true);
    try {
      const result = await stripe.createToken(cardElement);
      if (result.error) {
        setError(result.error.message || 'Your card details could not be verified.');
        return;
      }
      if (!result.token?.id) {
        setError('The payment provider did not return a payment token.');
        return;
      }
      await onConfirm(result.token.id);
    } catch (tokenError) {
      setError(tokenError.message || 'Could not securely verify your card.');
    } finally {
      submittingRef.current = false;
      setTokenizing(false);
    }
  }

  const busy = tokenizing || isSubmitting;

  return (
    <fieldset className="active" data-step="3">
      <StepHeader
        title="Step 4: Payment"
        description="Your card details are securely collected by Stripe and are never sent to the cinema website."
      />
      <div className="booking-subtotal-bar">
        <div className="subtotal-item booking-subtotal-values">
          <div className="subtotal-metric">
            <span>{movieTitle}</span>
            <strong>{seats.join(', ')}</strong>
          </div>
          <div className="subtotal-metric">
            <span>Total due</span>
            <strong>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(totalAmount)}</strong>
          </div>
        </div>
      </div>
      {!isConfigured && (
        <p className="form-notice" role="alert">
          Secure card payments are not configured. Add VITE_STRIPE_PUBLISHABLE_KEY to enable checkout.
        </p>
      )}
      {isConfigured && !stripe && !stripeLoadError && (
        <p className="showtime-placeholder" role="status">Loading secure payment form...</p>
      )}
      {stripeLoadError && <p className="form-notice" role="alert">{stripeLoadError}</p>}
      {isConfigured && (
        <div className="form-group">
          <label htmlFor="guest-payment-card">Card details</label>
          <div id="guest-payment-card" className="form-control stripe-card-element">
            <CardElement
              options={{
                hidePostalCode: true,
                style: {
                  base: {
                    color: '#fff',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '16px',
                    '::placeholder': { color: '#a9adbd' },
                  },
                  invalid: { color: '#ff8a8a' },
                },
              }}
            />
          </div>
        </div>
      )}
      {error && <p className="form-notice" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="form-button previous" type="button" onClick={onBack} disabled={busy}>Back</button>
        <button
          className="form-button next"
          type="button"
          onClick={createPaymentToken}
          disabled={!isConfigured || !stripe || busy}
        >
          {busy ? 'Completing booking...' : 'Pay and book'}
        </button>
      </div>
    </fieldset>
  );
}

export function PaymentStep({
  onBack, onConfirm, isSubmitting, movieTitle, seats, totalAmount,
}) {
  const [stripeLoadError, setStripeLoadError] = useState('');

  useEffect(() => {
    if (!stripePromise) return undefined;

    let active = true;
    stripePromise
      .then((stripe) => {
        if (active && !stripe) setStripeLoadError('The secure payment form could not be initialized.');
      })
      .catch(() => {
        if (active) setStripeLoadError('The secure payment form could not be loaded. Check your connection and try again.');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Elements stripe={stripePromise}>
      <GuestPaymentForm
        onBack={onBack}
        onConfirm={onConfirm}
        isSubmitting={isSubmitting}
        isConfigured={Boolean(publishableKey)}
        stripeLoadError={stripeLoadError}
        movieTitle={movieTitle}
        seats={seats}
        totalAmount={totalAmount}
      />
    </Elements>
  );
}
