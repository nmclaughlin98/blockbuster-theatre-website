import { useEffect, useState } from 'react';
import {
    COGNITO_AUTH_STATE_CHANGE_EVENT,
    cognitoAuth,
    getCognitoFirstName,
} from '../../../auth/cognitoAuth';
import { asset } from '../asset/asset';

const links = [
    ['Home', '/', 'home'],
    ['Now Showing', './nowShowing.html', 'now'],
    ['Coming Soon', './comingSoon.html', 'coming'],
    ['About', './about.html', 'about'],
];

// Helper to blur element on tap/click to strip sticky hover states on mobile
function handleBlurClick(e, callback) {
    e.currentTarget.blur();
    if (callback) callback(e);
}

function Brand({ onClick }) {
    return (
        <a
            className="header-box"
            href="/"
            onClick={(e) => handleBlurClick(e, onClick)}
        >
            <picture>
                <source
                    srcSet={`${asset('assets/images/logo/logo-60.webp')} 1x, ${asset('assets/images/logo/logo-120.webp')} 2x, ${asset('assets/images/logo/logo-180.webp')} 3x`}
                    type="image/webp"
                />
                <img src={asset('assets/images/logo/png/logo-120.png')} alt="Blockbuster Theatre" className="logo" />
            </picture>
            <span className="header-text">BLOCKBUSTER<br />THEATRE</span>
        </a>
    );
}

function Navigation({ current, open, onNavigate, isAuthenticated, displayName }) {
    return (
        <nav className={`nav primary-nav ${open ? 'open' : ''}`}>
            <ul className="menu">
                {links.map(([label, href, key]) => (
                    <li key={key}>
                        <a
                            className={current === key ? 'current' : ''}
                            href={href}
                            onClick={(e) => handleBlurClick(e, onNavigate)}
                        >
                            {label}
                        </a>
                    </li>
                ))}
                <li>
                    <a
                        className={`nav-cta-btn ${current === 'login' ? 'current' : ''}`}
                        href="./login.html"
                        onClick={(e) => handleBlurClick(e, onNavigate)}
                        aria-label={isAuthenticated ? `Account for ${displayName || 'signed-in user'}` : 'Log in'}
                    >
                        {isAuthenticated && (
                            <svg
                                className="nav-account-icon"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                                focusable="false"
                            >
                                <circle cx="12" cy="8" r="3.5" />
                                <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
                            </svg>
                        )}
                        <span>{isAuthenticated ? displayName || 'Account' : 'Login'}</span>
                    </a>
                </li>
            </ul>
        </nav>
    );
}

function MenuButton({ open, onClick }) {
    return (
        <button
            className="hamburger"
            aria-label="Toggle navigation"
            onClick={(e) => handleBlurClick(e, onClick)}
        >
            <span className={`line ${open ? 'transition' : ''}`} />
            <span className={`line ${open ? 'transition' : ''}`} />
            <span className={`line ${open ? 'transition' : ''}`} />
        </button>
    );
}

export function Header({ current, authClient = cognitoAuth }) {
    const [open, setOpen] = useState(false);
    const [account, setAccount] = useState({ isAuthenticated: false, displayName: '' });
    const closeMenu = () => setOpen(false);

    useEffect(() => {
        let active = true;
        let requestId = 0;

        async function updateAccount() {
            const currentRequestId = ++requestId;
            try {
                const session = await authClient.fetchAuthSession();
                if (!active || currentRequestId !== requestId) return;

                const isAuthenticated = Boolean(session.tokens?.accessToken);
                setAccount({
                    isAuthenticated,
                    displayName: isAuthenticated ? getCognitoFirstName(session) : '',
                });
            } catch (error) {
                if (active && currentRequestId === requestId) {
                    setAccount({ isAuthenticated: false, displayName: '' });
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
    }, [authClient]);

    useEffect(() => {
        if (!open) return undefined;

        const root = document.documentElement;
        root.classList.add('nav-menu-open');
        return () => {
            root.classList.remove('nav-menu-open');
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
                    isAuthenticated={account.isAuthenticated}
                    displayName={account.displayName}
                />
                <MenuButton open={open} onClick={() => setOpen((value) => !value)} />
            </header>
            <div
                className={`ham-overlay ${open ? 'show' : ''}`}
                onClick={closeMenu}
            />
        </>
    );
}
