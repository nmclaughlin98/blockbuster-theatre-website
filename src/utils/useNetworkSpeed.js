import { useEffect, useState } from 'react';

const SLOW_CONNECTION_TYPES = new Set(['slow-2g', '2g', '3g']);

function isSlowConnection() {
    if (typeof navigator === 'undefined') return false;

    const connection = navigator.connection;
    return Boolean(connection?.saveData || SLOW_CONNECTION_TYPES.has(connection?.effectiveType));
}

export function useNetworkSpeed() {
    const [isSlow, setIsSlow] = useState(isSlowConnection);

    useEffect(() => {
        if (typeof navigator === 'undefined') return undefined;

        const connection = navigator.connection;
        if (!connection?.addEventListener) return undefined;

        const updateConnectionStatus = () => setIsSlow(isSlowConnection());
        connection.addEventListener('change', updateConnectionStatus);
        updateConnectionStatus();

        return () => connection.removeEventListener('change', updateConnectionStatus);
    }, []);

    return isSlow;
}
