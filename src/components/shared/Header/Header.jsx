import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    COGNITO_AUTH_STATE_CHANGE_EVENT,
    cognitoAuth,
    getCognitoFullName,
} from '../../../auth/cognitoAuth';
import { useConfig } from '../../../context/ConfigContext';
import { asset } from '../asset/asset';
import { UserAvatar } from '../UserAvatar/UserAvatar';
import { UserDropdown } from './UserDropdown';
import styles from './Header.module.css';

const links = [
    ['Home', '/', 'home'],
    ['Now Showing', '/now-showing', 'now'],
    ['Coming Soon', '/coming-soon', 'coming'],
    ['About', '/about', 'about'],
];

// Helper to blur element on tap/click to clear focus states after navigation
function handleBlurClick(e, callback) {
    e.currentTarget.blur();
    if (callback) callback(e);
}

function Brand({ onClick }) {
    return (
        <Link
            className={styles['header-box']}
            to="/"
            onClick={(e) => handleBlurClick(e, onClick)}
        >
            <picture>
                <source
                    srcSet={`${asset('assets/images/logo/logo-60.webp')} 1x, ${asset('assets/images/logo/logo-120.webp')} 2x, ${asset('assets/images/logo/logo-180.webp')} 3x`}
                    type="image/webp"
                />
                <img src={asset('assets/images/logo/png/logo-120.png')} alt="Blockbuster Theatre" className={styles.logo} />
            </picture>
            <span className={styles['header-text']}>BLOCKBUSTER<br />THEATRE</span>
        </Link>
    );
}

function SignInIcon() {
    return (
        <svg className={styles['nav-account-icon']} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
        </svg>
    );
}

function SignInLink({ className = '', onClick }) {
    return (
        <Link
            className={`${styles['nav-account-cta-btn']} ${className}`}
            to="/login"
            onClick={(e) => handleBlurClick(e, onClick)}
        >
            <SignInIcon />
            <span>SIGN IN</span>
        </Link>
    );
}

function Navigation({ current, open, onNavigate, account, authClient, loginEnabled }) {
    const isAuthenticated = account.isAuthenticated;
    const isLoading = account.status === 'loading';
    const showAuthControls = loginEnabled && !isLoading;

    return (
        <nav className={`nav ${styles['primary-nav']} ${open ? 'open' : ''}`}>
            <ul className={styles.menu}>
                {links.map(([label, href, key]) => (
                    <li key={key}>
                        <Link
                            className={styles[current === key ? 'current' : '']}
                            to={href}
                            onClick={(e) => handleBlurClick(e, onNavigate)}
                        >
                            {label}
                        </Link>
                    </li>
                ))}
                {showAuthControls && (
                    <li className={styles['nav-desktop-auth']}>
                        {isAuthenticated ? (
                            <UserDropdown account={account} authClient={authClient} />
                        ) : (
                            <SignInLink onClick={onNavigate} />
                        )}
                    </li>
                )}
            </ul>
            {showAuthControls && (
                <div className={styles['nav-mobile-auth']}>
                    <div className={styles['nav-auth-divider']} />
                    {isAuthenticated ? (
                        <Link
                            className={styles['nav-mobile-profile']}
                            to="/account"
                            onClick={(e) => handleBlurClick(e, onNavigate)}
                        >
                            <UserAvatar name={account.displayName} imageUrl={account.imageUrl} size="mobile" />
                            <span className={styles['nav-mobile-profile-text']}>
                                <strong>{account.displayName || 'Name unavailable'}</strong>
                                <span>View Profile</span>
                            </span>
                        </Link>
                    ) : (
                        <SignInLink onClick={onNavigate} />
                    )}
                </div>
            )}
        </nav>
    );
}

function MenuButton({ open, onClick }) {
    return (
        <button
            className={styles.hamburger}
            type="button"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            onClick={(e) => handleBlurClick(e, onClick)}
        >
            <span className={`${styles.line} ${open ? styles.transition : ''}`} />
            <span className={`${styles.line} ${open ? styles.transition : ''}`} />
            <span className={`${styles.line} ${open ? styles.transition : ''}`} />
        </button>
    );
}

export function Header({ current, authClient = cognitoAuth }) {
    const { config } = useConfig();
    const { loginEnabled } = config.features;

    const [open, setOpen] = useState(false);
    const [account, setAccount] = useState({
        status: 'loading',
        isAuthenticated: false,
        displayName: '',
        email: '',
        imageUrl: undefined,
    });
    const closeMenu = () => setOpen(false);

    useEffect(() => {
        if (!loginEnabled) {
            setAccount({
                status: 'signed-out',
                isAuthenticated: false,
                displayName: '',
                email: '',
                imageUrl: undefined,
            });
            return undefined;
        }

        let active = true;
        let requestId = 0;

        async function updateAccount() {
            const currentRequestId = ++requestId;
            try {
                const session = await authClient.fetchAuthSession();
                if (!active || currentRequestId !== requestId) return;

                const isAuthenticated = Boolean(session.tokens?.accessToken);
                const claims = session.tokens?.idToken?.payload ?? {};
                setAccount({
                    status: isAuthenticated ? 'authenticated' : 'signed-out',
                    isAuthenticated,
                    displayName: isAuthenticated ? getCognitoFullName(session) : '',
                    email: isAuthenticated && typeof claims.email === 'string' ? claims.email.trim() : '',
                    imageUrl: undefined,
                });
            } catch (error) {
                if (active && currentRequestId === requestId) {
                    setAccount({ status: 'signed-out', isAuthenticated: false, displayName: '', email: '', imageUrl: undefined });
                    console.error('Unable to check the Cognito session for the header.', error);
                }
            }
        }

        updateAccount();
        window.addEventListener(COGNITO_AUTH_STATE_CHANGE_EVENT, updateAccount);
        return () => {
            active = false;
            window.removeEventListener(COGNITO_AUTH_STATE_CHANGE_EVENT, updateAccount);
        };
    }, [authClient, loginEnabled]);

    useEffect(() => {
        if (!open) return undefined;

        const root = document.documentElement;
        root.classList.add(styles['nav-menu-open']);
        return () => {
            root.classList.remove(styles['nav-menu-open']);
        };
    }, [open]);

    return (
        <>
            <header>
                <Brand onClick={closeMenu} />
                <Navigation
                    current={current}
                    open={open}
                    onNavigate={closeMenu}
                    account={account}
                    authClient={authClient}
                    loginEnabled={loginEnabled}
                />
                <MenuButton open={open} onClick={() => setOpen((value) => !value)} />
            </header>
            <div
                className={`${styles['ham-overlay']} ${open ? styles['show'] : ''}`}
                onClick={closeMenu}
            />
        </>
    );
}
