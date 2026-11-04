import { forwardRef } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './DatePicker.css';

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

const DatePickerInput = forwardRef(function DatePickerInput({ value, ...props }, ref) {
  return <input {...props} ref={ref} value={value ?? ''} />;
});

export function DatePicker({
  variant = 'default',
  className,
  calendarClassName,
  calendarIconClassName,
  wrapperClassName,
  customInput = <DatePickerInput />,
  formatWeekDay = (dayName) => dayName.slice(0, 3),
  onChangeRaw,
  onKeyDown,
  readOnly = false,
  showIcon = true,
  toggleCalendarOnIconClick = true,
  ...props
}) {
  const variantClass = variant ? `date-picker--${variant}` : '';
  const calendarVariantClass = variant ? `date-picker-calendar--${variant}` : '';
  const disabledClass = props.disabled ? 'date-picker__wrapper--disabled' : '';
  const handleChangeRaw = (event, ...args) => {
    onChangeRaw?.(event, ...args);
    if (event?.type === 'change' && !event.defaultPrevented) event.preventDefault();
  };
  const handleKeyDown = (event) => {
    onKeyDown?.(event);
    if (!event.defaultPrevented && (event.key.length === 1 || ['Backspace', 'Delete'].includes(event.key))) {
      event.preventDefault();
    }
  };

  return (
    <ReactDatePicker
      {...props}
      className={joinClassNames('date-picker__input', variantClass, className)}
      calendarClassName={joinClassNames('date-picker__calendar', calendarVariantClass, calendarClassName)}
      calendarIconClassName={joinClassNames('date-picker__calendar-icon', calendarIconClassName)}
      wrapperClassName={joinClassNames('date-picker__wrapper', disabledClass, wrapperClassName)}
      customInput={customInput}
      formatWeekDay={formatWeekDay}
      onChangeRaw={handleChangeRaw}
      onKeyDown={handleKeyDown}
      readOnly={readOnly}
      showIcon={showIcon}
      toggleCalendarOnIconClick={toggleCalendarOnIconClick}
    />
  );
}
