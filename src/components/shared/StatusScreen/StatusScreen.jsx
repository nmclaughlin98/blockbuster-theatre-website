import { useState } from 'react';
import './StatusScreen.css';

const STATUS_CONTENT = {
    loading: {
        badge: 'Loading',
        title: 'BLOCKBUSTER THEATRE',
        defaultMessage: 'Preparing your cinema experience...',
        showRetry: false,
    },
    maintenance: {
        badge: 'Under Maintenance',
        title: 'BLOCKBUSTER THEATRE',
        defaultMessage: "We're updating our cinema listings. Back shortly!",
        showRetry: false,
    },
    offline: {
        badge: 'No Connection',
        title: 'You Are Offline',
        defaultMessage: 'You appear to be offline. Check your connection and try again.',
        showRetry: true,
    },
};

export function StatusScreen({ mode = 'maintenance', message, onRetry }) {
    const [isRetrying, setIsRetrying] = useState(false);
    const content = STATUS_CONTENT[mode] ?? STATUS_CONTENT.maintenance;

    async function handleRetry() {
        if (!onRetry || isRetrying) return;
        setIsRetrying(true);
        try {
            await onRetry();
        } finally {
            setIsRetrying(false);
        }
    }

    return (
        <main className="status-screen" role="status" aria-live="polite">
            <div className="status-screen__card">
                {mode === 'loading' ? (
                    <div className="status-screen__spinner" aria-hidden="true" />
                ) : (
                    <span className={`status-screen__badge status-screen__badge--${mode}`}>
                        {content.badge}
                    </span>
                )}

                <h1 className="status-screen__title">{content.title}</h1>
                <p className="status-screen__message">{message || content.defaultMessage}</p>

                {content.showRetry && onRetry && (
                    <button
                        type="button"
                        className="status-screen__retry-btn"
                        onClick={handleRetry}
                        disabled={isRetrying}
                    >
                        {isRetrying ? 'Checking...' : 'Try Again'}
                    </button>
                )}
            </div>
        </main>
    );
}