import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { COGNITO_AUTH_STATE_CHANGE_EVENT } from '../../../auth/cognitoAuth';
import { UserAvatar } from '../UserAvatar/UserAvatar';
import styles from './UserDropdown.module.css';

const CLOSE_ANIMATION_DURATION_MS = 180;

export function UserDropdown({ account, authClient }) {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuMounted, setMenuMounted] = useState(false);
    const [menuClosing, setMenuClosing] = useState(false);
    const [signOutError, setSignOutError] = useState('');
    const [signingOut, setSigningOut] = useState(false);
    const menuRef = useRef(null);
    const triggerRef = useRef(null);
    const closeTimerRef = useRef(null);

    const closeMenu = useCallback(() => {
        setMenuOpen(false);
        if (!menuMounted) return;

        setMenuClosing(true);
        window.clearTimeout(closeTimerRef.current);
        const prefersReducedMotion = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setMenuMounted(false);
            setMenuClosing(false);
            return;
        }

        closeTimerRef.current = window.setTimeout(() => {
            setMenuMounted(false);
            setMenuClosing(false);
            closeTimerRef.current = null;
        }, CLOSE_ANIMATION_DURATION_MS);
    }, [menuMounted]);

    const openMenu = useCallback(() => {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
        setMenuClosing(false);
        setMenuMounted(true);
        setMenuOpen(true);
    }, []);

    useEffect(() => {
        if (!menuOpen) return undefined;

        function handlePointerDown(event) {
            if (!menuRef.current?.contains(event.target)) closeMenu();
        }
        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                closeMenu();
                triggerRef.current?.focus();
            }
        }

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [menuOpen, closeMenu]);

    useEffect(() => () => {
        window.clearTimeout(closeTimerRef.current);
    }, []);

    async function handleSignOut() {
        if (signingOut) return;
        setSigningOut(true);
        setSignOutError('');
        try {
            await authClient.signOut();
            window.dispatchEvent(new window.CustomEvent(COGNITO_AUTH_STATE_CHANGE_EVENT, {
                detail: { toastMessage: 'Logged out successfully.' },
            }));
            closeMenu();
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Unable to sign out from the navigation menu.', error);
            setSignOutError('Could not sign out. Please try again.');
        } finally {
            setSigningOut(false);
        }
    }

    return (
        <div className={styles.userMenu} ref={menuRef}>
            <button
                type="button"
                className={styles.avatarTrigger}
                ref={triggerRef}
                aria-label={`Open account menu for ${account.displayName || 'signed-in user'}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => (menuOpen ? closeMenu() : openMenu())}
            >
                <UserAvatar name={account.displayName} imageUrl={account.imageUrl} size="nav" />
            </button>
            {menuMounted && (
                <div
                    className={`${styles.dropdown} ${menuClosing ? styles.closing : ''}`}
                    role="menu"
                    aria-hidden={menuClosing}
                    inert={menuClosing}
                >
                    <div className={styles.header}>
                        <strong>{account.displayName || 'Name unavailable'}</strong>
                        <span>{account.email ? account.email.toLowerCase() : 'Email unavailable'}</span>
                    </div>
                    <Link className={styles.dropdownLink} to="/account" role="menuitem" onClick={closeMenu}>Overview</Link>
                    <Link className={styles.dropdownLink} to="/account?tab=bookings" role="menuitem" onClick={closeMenu}>My Bookings</Link>
                    <Link className={styles.dropdownLink} to="/account?tab=settings" role="menuitem" onClick={closeMenu}>Account Settings</Link>
                    {signOutError && <p className={styles.signOutError} role="alert">{signOutError}</p>}
                    <button
                        type="button"
                        role="menuitem"
                        className={styles.signOut}
                        onClick={handleSignOut}
                        disabled={signingOut}
                    >
                        <span>{signingOut ? 'Signing Out...' : 'Sign Out'}</span>
                        <span className={styles.signOutIcon} aria-hidden="true">logout</span>
                    </button>
                </div>
            )}
        </div>
    );
}
