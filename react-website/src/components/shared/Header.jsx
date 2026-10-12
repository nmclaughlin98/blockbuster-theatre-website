import { useState } from 'react';
import { asset } from './asset';

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
            onClick={ (e) => handleBlurClick(e, onClick) }
        >
            <picture>
                <source
                    srcSet={ `${ asset('assets/images/logo/logo-60.webp') } 1x, ${ asset('assets/images/logo/logo-120.webp') } 2x, ${ asset('assets/images/logo/logo-180.webp') } 3x` }
                    type="image/webp"
                />
                <img src={ asset('assets/images/logo/png/logo-120.png') } alt="Blockbuster Theatre" className="logo"/>
            </picture>
            <span className="header-text">BLOCKBUSTER<br/>THEATRE</span>
        </a>
    );
}

function Navigation({ current, open, onNavigate }) {
    return (
        <nav className={ `nav primary-nav ${ open ? 'open' : '' }` }>
            <ul className="menu">
                { links.map(([label, href, key]) => (
                    <li key={ key }>
                        <a
                            className={ current === key ? 'current' : '' }
                            href={ href }
                            onClick={ (e) => handleBlurClick(e, onNavigate) }
                        >
                            { label }
                        </a>
                    </li>
                )) }
                <li>
                    <a
                        className={ `nav-cta-btn ${ current === 'booking' ? 'current' : '' }` }
                        href="./bookNow.html"
                        onClick={ (e) => handleBlurClick(e, onNavigate) }
                    >
                        Book Tickets
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
            onClick={ (e) => handleBlurClick(e, onClick) }
        >
            <span className={ `line ${ open ? 'transition' : '' }` }/>
            <span className={ `line ${ open ? 'transition' : '' }` }/>
            <span className={ `line ${ open ? 'transition' : '' }` }/>
        </button>
    );
}

export function Header({ current }) {
    const [open, setOpen] = useState(false);
    const closeMenu = () => setOpen(false);

    return (
        <>
            <header>
                <Brand onClick={ closeMenu }/>
                <Navigation current={ current } open={ open } onNavigate={ closeMenu }/>
                <MenuButton open={ open } onClick={ () => setOpen((value) => !value) }/>
            </header>
            <div
                className={ `ham-overlay ${ open ? 'show' : '' }` }
                onClick={ closeMenu }
            />
        </>
    );
}
