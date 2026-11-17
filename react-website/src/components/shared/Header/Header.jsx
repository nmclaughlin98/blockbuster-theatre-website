import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    COGNITO_AUTH_STATE_CHANGE_EVENT,
    cognitoAuth,
    getCognitoFullName,
} from '../../../auth/cognitoAuth';
import { asset } from '../asset/asset';
import { UserAvatar } from '../UserAvatar/UserAvatar';

const links = [
    ['Home', '/', 'home'],
    ['Now Showing', '/now-showing', 'now'],
    ['Coming Soon', '/coming-soon', 'coming'],
    ['About', '/about', 'about'],
];

// Helper to blur element on tap/click to strip sticky hover states on mobile
function handleBlurClick(e, callback) {
    e.currentTarget.blur();
    if (callback) callback(e);
}

function Brand({ onClick }) {
    return (
        <Link
            className="header-box"
            to="/"
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
        </Link>
    );
}

function SignInIcon() {
    return (
        <svg className="nav-account-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
        </svg>
    );
}

function SignOutIcon() {
    return (
        <svg className="nav-dropdown-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
            <path d="M10 17l5-5-5-5M15 12H3m9-7h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6" />
        </svg>
    );
}

function SignInLink({ className = '', onClick }) {
    return (
        <Link className={`nav-account-cta-btn ${className}`} to="/login" onClick={onClick}>
            <SignInIcon />
            <span>SIGN IN</span>
        </Link>
    );
}

function UserMenu({ account, authClient }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [signOutError, setSignOutError] = useState('');
    const [signingOut, setSigningOut] = useState(false);
    const menuRef = useRef(null);
    const closeMenu = () => setMenuOpen(false);

    useEffect(() => {
        if (!menuOpen) return undefined;

        function handlePointerDown(event) {
            if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
        }
        function handleKeyDown(event) {
            if (event.key === 'Escape') setMenuOpen(false);
        }

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [menuOpen]);

    async function handleSignOut() {
        if (signingOut) return;
        setSigningOut(true);
        setSignOutError('');
        try {
            await authClient.signOut();
            window.dispatchEvent(new window.Event(COGNITO_AUTH_STATE_CHANGE_EVENT));
            closeMenu();
        } catch (error) {
            console.error('Unable to sign out from the navigation menu.', error);
            setSignOutError('Could not sign out. Please try again.');
        } finally {
            setSigningOut(false);
        }
    }

    return (
        <div className="nav-user-menu" ref={menuRef}>
            <button
                type="button"
                className="nav-avatar-trigger"
                aria-label={`Open account menu for ${account.displayName || 'signed-in user'}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((isOpen) => !isOpen)}
            >
                <UserAvatar name={account.displayName} imageUrl={account.imageUrl} size="nav" />
            </button>
            {menuOpen && (
                <div className="nav-dropdown" role="menu">
                    <div className="nav-dropdown-header">
                        <strong>{account.displayName || 'Name unavailable'}</strong>
                        <span>{account.email || 'Email unavailable'}</span>
                    </div>
                    <Link to="/account" role="menuitem" onClick={closeMenu}>My Bookings</Link>
                    <Link to="/account" role="menuitem" onClick={closeMenu}>Account Settings</Link>
                    {signOutError && <p className="nav-signout-error" role="alert">{signOutError}</p>}
                    <button type="button" role="menuitem" onClick={handleSignOut} disabled={signingOut}>
                        <SignOutIcon />
                        {signingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                </div>
            )}
        </div>
    );
}

function Navigation({ current, open, onNavigate, account, authClient }) {
    const isAuthenticated = account.isAuthenticated;
    return (
        <nav className={`nav primary-nav ${open ? 'open' : ''}`}>
            <ul className="menu">
                {links.map(([label, href, key]) => (
                    <li key={key}>
                        <Link
                            className={current === key ? 'current' : ''}
                            to={href}
                            onClick={(e) => handleBlurClick(e, onNavigate)}
                        >
                            {label}
                        </Link>
                    </li>
                ))}
                <li className="nav-desktop-auth">
                    {isAuthenticated ? (
                <UserMenu account={account} authClient={authClient} />
                    ) : (
                <SignInLink
                    onClick={(e) => handleBlurClick(e, onNavigate)}
                />
                    )}
                </li>
            </ul>
            <div className="nav-mobile-auth">
                <div className="nav-auth-divider" />
                {isAuthenticated ? (
                    <Link
                className="nav-mobile-profile"
                to="/account"
                onClick={(e) => handleBlurClick(e, onNavigate)}
                    >
                <UserAvatar name={account.displayName} imageUrl={account.imageUrl} size="mobile" />
                <span className="nav-mobile-profile-text">
                    <strong>{account.displayName || 'Name unavailable'}</strong>
                    <span>View Profile</span>
                </span>
                    </Link>
                ) : (
                    <SignInLink onClick={(e) => handleBlurClick(e, onNavigate)} />
                )}
            </div>
        </nav>
    );
}

function MenuButton({ open, onClick }) {
    return (
        <button
            className="hamburger"
            type="button"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
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
    const [account, setAccount] = useState({
        isAuthenticated: false,
        displayName: '',
        email: '',
        imageUrl: undefined,
    });
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
                const claims = session.tokens?.idToken?.payload ?? {};
                setAccount({
                    isAuthenticated,
                    displayName: isAuthenticated ? getCognitoFullName(session) : '',
                    email: isAuthenticated && typeof claims.email === 'string' ? claims.email.trim() : '',
                    imageUrl: undefined,
                });
            } catch (error) {
                if (active && currentRequestId === requestId) {
                    setAccount({ isAuthenticated: false, displayName: '', email: '', imageUrl: undefined });
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
                    account={account}
                    authClient={authClient}
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
