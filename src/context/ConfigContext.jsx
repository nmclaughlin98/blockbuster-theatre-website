import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { DEFAULT_RUNTIME_CONFIG, normalizeRuntimeConfig } from './runtime-config.js';

const ConfigContext = createContext(undefined);

export function ConfigProvider({ children }) {
    const [config, setConfig] = useState(DEFAULT_RUNTIME_CONFIG);
    const [isConfigLoading, setIsConfigLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

    const fetchConfig = useCallback(async () => {
        const configUrl = import.meta.env.VITE_CONFIG_URL;

        if (!configUrl) {
            console.warn('VITE_CONFIG_URL is not set; using fallback config.');
            setIsConfigLoading(false);
            return;
        }

        try {
            const response = await fetch(configUrl, { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`Config fetch failed with status ${response.status}`);
            }

            const data = await response.json();

            setConfig(normalizeRuntimeConfig(data));
        } catch (error) {
            console.error('Failed to load remote config, using defaults:', error);
            setConfig(DEFAULT_RUNTIME_CONFIG);
        } finally {
            setIsConfigLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchConfig();
    }, [fetchConfig]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            void fetchConfig();
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [fetchConfig]);

    const value = useMemo(
        () => ({
            config,
            isConfigLoading,
            isOffline,
            refreshConfig: fetchConfig,
        }),
        [config, isConfigLoading, isOffline, fetchConfig]
    );

    return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
}