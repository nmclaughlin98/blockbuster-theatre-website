import { useRef, useState } from 'react';
import { StepHeader } from './BookingStepComponents';

export function DemoPayment({ onBack, onConfirm, onPaymentInput, isSending = false }) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const demoNoticeShown = useRef(false);
  const paymentMethods = [
    { id: 'card', label: 'Credit / Debit Card' },
    { id: 'apple-pay', label: 'Apple Pay' },
    { id: 'google-pay', label: 'Google Pay' },
  ];

  function handlePaymentInput(event) {
    if (!event.currentTarget.value.trim() || demoNoticeShown.current) return;
    demoNoticeShown.current = true;
    onPaymentInput();
  }

  return (
    <fieldset className="active" data-step="3">
      <StepHeader
        title="Step 4: Payment"
        description="This is a demo only. No payment is processed, and no valid ticket or seat reservation is issued."
      />
      {paymentMethod === 'card' && (
        <div className="card-preview-container" aria-label="Sample payment card preview">
          <div className="credit-card-mockup">
            <div className="demo-card-top-row">
              <span className="card-chip" />
              <strong className="demo-card-brand">VISA</strong>
            </div>
            <div className="card-number-display" aria-label="Masked sample card number">•••• •••• •••• ••••</div>
            <div className="card-meta-row">
              <div className="card-holder-display">Cardholder<span>Your Name</span></div>
              <div className="card-expiry-display">Expires<span>MM/YY</span></div>
            </div>
          </div>
        </div>
      )}
      <div className="payment-methods-grid" role="group" aria-label="Demo payment method">
        {paymentMethods.map((method) => (
          <button
            className={`payment-chip ${paymentMethod === method.id ? 'active' : ''}`}
            type="button"
            aria-pressed={paymentMethod === method.id}
            key={method.id}
            onClick={() => setPaymentMethod(method.id)}
          >
            {method.label}
          </button>
        ))}
      </div>
      {paymentMethod === 'card' ? (
        <div className="demo-payment-fields" role="group" aria-label="Optional demo card details">
          <div className="demo-payment-field-group">
            <label className="demo-payment-field-label" htmlFor="demo-card-number">Card Number</label>
            <input
              className="demo-payment-field"
              id="demo-card-number"
              type="text"
              inputMode="numeric"
              placeholder="Card number"
              onChange={handlePaymentInput}
            />
          </div>
          <div className="demo-payment-field-group">
            <label className="demo-payment-field-label" htmlFor="demo-cardholder-name">Cardholder Name</label>
            <input
              className="demo-payment-field"
              id="demo-cardholder-name"
              type="text"
              placeholder="Name on card"
              onChange={handlePaymentInput}
            />
          </div>
          <div className="demo-payment-fields-row">
            <div className="demo-payment-field-group">
              <label className="demo-payment-field-label" htmlFor="demo-card-expiration">Expiration (MM/YY)</label>
              <input
                className="demo-payment-field"
                id="demo-card-expiration"
                type="text"
                inputMode="numeric"
                placeholder="MM/YY"
                onChange={handlePaymentInput}
              />
            </div>
            <div className="demo-payment-field-group">
              <label className="demo-payment-field-label" htmlFor="demo-card-security-code">Security Code (CVV)</label>
              <input
                className="demo-payment-field"
                id="demo-card-security-code"
                type="text"
                inputMode="numeric"
                placeholder="CVV"
                onChange={handlePaymentInput}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="demo-payment-wallet" role="status">
          {paymentMethod === 'apple-pay' ? 'Apple Pay' : 'Google Pay'} is not connected in this demo. No payment will be processed.
        </p>
      )}
      <div className="form-actions">
        <button className="form-button previous" type="button" onClick={onBack} disabled={isSending}>Back</button>
        <button className="form-button next" type="button" onClick={onConfirm} disabled={isSending}>
          {isSending ? 'Sending confirmation...' : 'Send demo confirmation'}
        </button>
      </div>
      {isSending && <p role="status">Sending demo confirmation email...</p>}
    </fieldset>
  );
}
