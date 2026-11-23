import { DirectionalButton } from '../../shared';

const steps = ['Tickets', 'Select Seats', 'Guest Info', 'Review', 'Confirmed'];

export function ProgressBar({ currentStep: rawStep, skipGuestInfo = false }) {
  const visibleSteps = skipGuestInfo ? steps.filter((label) => label !== 'Guest Info') : steps;
  const currentStep = skipGuestInfo && rawStep > 2 ? rawStep - 1 : rawStep;

  return (
    <ol id="progressbar" aria-label="Booking progress">
      {visibleSteps.map((label, index) => (
        <li
          className={`${index <= currentStep ? 'active' : ''} ${index < currentStep || (index === currentStep && currentStep === visibleSteps.length - 1) ? 'completed' : ''
            }`}
          key={label}
        >
          {label}
        </li>
      ))}
    </ol>
  );
}

export function StepHeader({ title, description }) {
  return <div className="step-header"><h2>{title}</h2><p>{description}</p></div>;
}

export function BookingLoader({ children, className = 'booking-loading' }) {
  return (
    <span className={className} role="status" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

export function StepActions({ onBack, onContinue, continueLabel, continueDisabled = false }) {
  return (
    <div className="form-actions">
      <DirectionalButton className="form-button previous" direction="previous" onClick={onBack}>Back</DirectionalButton>
      <DirectionalButton className="form-button" direction="next" onClick={onContinue} disabled={continueDisabled}>{continueLabel}</DirectionalButton>
    </div>
  );
}
