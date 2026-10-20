import { useEffect, useState } from 'react';

export function Toast({ message, onDismiss }) {
  const [lastMessage, setLastMessage] = useState(message);

  if (message && message !== lastMessage) {
    setLastMessage(message);
  }

  useEffect(() => {
    if (!message) return undefined;

    const timeout = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  function handleTransitionEnd(event) {
    if (event.target === event.currentTarget && event.propertyName === 'opacity' && !message) {
      setLastMessage('');
    }
  }

  return (
    <div
      className={`toast-notification ${message ? 'show' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={!message}
      onTransitionEnd={handleTransitionEnd}
    >
      {(message || lastMessage) && <span>{message || lastMessage}</span>}
    </div>
  );
}
