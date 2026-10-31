import { useState } from 'react';
import { StepActions, StepHeader } from './BookingStepComponents';

const emptyCustomer = { firstName: '', surname: '', email: '' };

export function GuestDetails({ initialData, onBack, onNext, onToast }) {
  const [customer, setCustomer] = useState(() => ({ ...emptyCustomer, ...initialData }));
  const [showErrors, setShowErrors] = useState(false);
  const firstNameValid = Boolean(customer.firstName.trim());
  const surnameValid = Boolean(customer.surname.trim());
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim());

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function continueToReview() {
    const issues = [];
    if (!firstNameValid) issues.push('Please enter your first name.');
    if (!surnameValid) issues.push('Please enter your surname.');
    if (!emailValid) issues.push('Please enter a valid email address.');

    if (issues.length) {
      setShowErrors(true);
      const toastMessage = issues.length > 1
        ? `Action required:\n\n${issues.map((issue) => `• ${issue}`).join('\n')}`
        : issues[0];
      onToast?.(toastMessage);
      return;
    }

    onNext(customer);
  }

  return (
    <fieldset className="active guest-details-form" data-step="2">
      <StepHeader title="Step 3: Guest Details" description="Enter the name and email address for your booking confirmation." />
      <div className="guest-name-grid">
        <div className="form-group">
          <label htmlFor="guest-first-name">First Name</label>
          <input
            type="text"
            id="guest-first-name"
            value={customer.firstName}
            onChange={(event) => updateCustomer('firstName', event.target.value)}
            aria-invalid={showErrors && !firstNameValid}
            aria-describedby={showErrors && !firstNameValid ? 'guest-first-name-error' : undefined}
            autoComplete="given-name"
            required
          />
          {showErrors && !firstNameValid && <p id="guest-first-name-error" className="guest-details-error" role="alert">Please enter your first name.</p>}
        </div>
        <div className="form-group">
          <label htmlFor="guest-surname">Surname</label>
          <input
            type="text"
            id="guest-surname"
            value={customer.surname}
            onChange={(event) => updateCustomer('surname', event.target.value)}
            aria-invalid={showErrors && !surnameValid}
            aria-describedby={showErrors && !surnameValid ? 'guest-surname-error' : undefined}
            autoComplete="family-name"
            required
          />
          {showErrors && !surnameValid && <p id="guest-surname-error" className="guest-details-error" role="alert">Please enter your surname.</p>}
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="guest-email">Email Address</label>
        <input
          id="guest-email"
          type="email"
          value={customer.email}
          onChange={(event) => updateCustomer('email', event.target.value)}
          aria-invalid={showErrors && !emailValid}
          aria-describedby={showErrors && !emailValid ? 'guest-email-error' : undefined}
          autoComplete="email"
          required
        />
        {showErrors && !emailValid && <p id="guest-email-error" className="guest-details-error" role="alert">Please enter a valid email address.</p>}
      </div>
      <StepActions
        onBack={onBack}
        onContinue={continueToReview}
        continueLabel="Review Booking"
      />
    </fieldset>
  );
}
