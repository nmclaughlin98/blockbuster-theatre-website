import { useEffect, useState } from 'react';
import styles from './Toast.module.css';

export function Toast({ message, type = 'warning', onDismiss }) {
  const activeType = type === 'success' ? 'success' : 'warning';
  const [lastMessage, setLastMessage] = useState(message);
  const [lastType, setLastType] = useState(activeType);

  if (message && message !== lastMessage) {
    setLastMessage(message);
  }
  if (message && activeType !== lastType) {
    setLastType(activeType);
  }

  useEffect(() => {
    if (!message) return undefined;

    const timeout = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  function handleTransitionEnd(event) {
    if (event.target === event.currentTarget && event.propertyName === 'opacity' && !message) {
      setLastMessage('');
      setLastType('warning');
    }
  }

  const displayedType = message ? activeType : lastType;

  return (
    <div
      className={`${styles.toastNotification} ${styles[displayedType]} ${message ? styles.show : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={!message}
      data-type={displayedType}
      onTransitionEnd={handleTransitionEnd}
    >
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {displayedType === 'success' ? (
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        ) : (
          <>
            <path d="M12 3.5 22 20.5H2L12 3.5Z" />
            <path d="M12 9v5" />
            <circle cx="12" cy="17" r=".75" />
          </>
        )}
      </svg>
      {(message || lastMessage) && <span>{message || lastMessage}</span>}
    </div>
  );
}
