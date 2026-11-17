import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { COGNITO_AUTH_STATE_CHANGE_EVENT } from '../../../auth/cognitoAuth';
import { UserAvatar } from '../UserAvatar/UserAvatar';
import styles from './UserDropdown.module.css';

export function UserDropdown({ account, authClient }) {
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
        <div className={styles.userMenu} ref={menuRef}>
            <button
                type="button"
                className={styles.avatarTrigger}
                aria-label={`Open account menu for ${account.displayName || 'signed-in user'}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((isOpen) => !isOpen)}
            >
                <UserAvatar name={account.displayName} imageUrl={account.imageUrl} size="nav" />
            </button>
            {menuOpen && (
                <div className={styles.dropdown} role="menu">
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
