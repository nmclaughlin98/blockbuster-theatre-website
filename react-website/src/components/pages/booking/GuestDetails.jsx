import { useState } from 'react';
import { StepActions, StepHeader } from './BookingStepComponents';

export function GuestDetails({ customer, onChange, onBack, onContinue }) {
  const [touched, setTouched] = useState({});
  const firstNameValid = Boolean(customer.firstName.trim());
  const surnameValid = Boolean(customer.surname.trim());
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim());

  return (
    <fieldset className="active" data-step="2">
      <StepHeader title="Step 3: Guest Details" description="Enter the name and email address for your booking confirmation." />
      <div className="guest-name-grid">
        <div className="form-group">
          <label htmlFor="guest-first-name">First Name</label>
          <input
            type="text"
            id="guest-first-name"
            value={customer.firstName}
            onChange={(event) => onChange('firstName', event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, firstName: true }))}
            aria-invalid={touched.firstName && !firstNameValid}
            aria-describedby={touched.firstName && !firstNameValid ? 'guest-first-name-error' : undefined}
            autoComplete="given-name"
            required
          />
          {touched.firstName && !firstNameValid && <p id="guest-first-name-error" className="form-notice" role="alert">Enter your first name.</p>}
        </div>
        <div className="form-group">
          <label htmlFor="guest-surname">Surname</label>
          <input
            type="text"
            id="guest-surname"
            value={customer.surname}
            onChange={(event) => onChange('surname', event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, surname: true }))}
            aria-invalid={touched.surname && !surnameValid}
            aria-describedby={touched.surname && !surnameValid ? 'guest-surname-error' : undefined}
            autoComplete="family-name"
            required
          />
          {touched.surname && !surnameValid && <p id="guest-surname-error" className="form-notice" role="alert">Enter your surname.</p>}
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="guest-email">Email Address</label>
        <input
          id="guest-email"
          type="email"
          value={customer.email}
          onChange={(event) => onChange('email', event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
          aria-invalid={touched.email && !emailValid}
          aria-describedby={touched.email && !emailValid ? 'guest-email-error' : undefined}
          autoComplete="email"
          required
        />
        {touched.email && !emailValid && <p id="guest-email-error" className="form-notice" role="alert">Enter a valid email address.</p>}
      </div>
      <StepActions
        onBack={onBack}
        onContinue={onContinue}
        continueLabel="Review Booking"
        continueDisabled={!firstNameValid || !surnameValid || !emailValid}
      />
    </fieldset>
  );
}
