import { StepActions, StepHeader } from './BookingStepComponents';

export function GuestDetails({ customer, onChange, onBack, onContinue }) {
  return (
    <fieldset className="active" data-step="2">
      <StepHeader title="Step 3: Guest Details" description="Where should we send your digital cinema ticket preview?" />
      <div className="guest-name-grid">
        <div className="form-group"><label htmlFor="guest-first-name">First Name</label><input type="text" id="guest-first-name" value={customer.firstName} onChange={(event) => onChange('firstName', event.target.value)} autoComplete="given-name" required /></div>
        <div className="form-group"><label htmlFor="guest-surname">Surname</label><input type="text" id="guest-surname" value={customer.surname} onChange={(event) => onChange('surname', event.target.value)} autoComplete="family-name" required /></div>
      </div>
      <div className="form-group"><label htmlFor="guest-email">Email Address</label><input id="guest-email" type="email" value={customer.email} onChange={(event) => onChange('email', event.target.value)} autoComplete="email" required /></div>
      <div className="form-group"><label htmlFor="guest-phone">Phone Number (Optional)</label><input id="guest-phone" type="tel" value={customer.phone} onChange={(event) => onChange('phone', event.target.value)} autoComplete="tel" /></div>
      <StepActions onBack={onBack} onContinue={onContinue} continueLabel="Continue to Payment" />
    </fieldset>
  );
}
