import { DirectionalButton } from '../../shared';

const steps = ['Tickets', 'Select Seats', 'Guest Info', 'Review', 'Confirmed'];

export function ProgressBar({ currentStep }) {
  return (
    <ol id="progressbar" aria-label="Booking progress">
      {steps.map((label, index) => (
        <li
          className={`${index <= currentStep ? 'active' : ''} ${index < currentStep || (index === currentStep && currentStep === steps.length - 1) ? 'completed' : ''
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
