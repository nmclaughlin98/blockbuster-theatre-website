const links = [
    ['Home', '/'],
    ['Now Showing', './nowShowing.html'],
    ['Coming Soon', './comingSoon.html'],
    ['About', './about.html'],
];

export function Footer() {
    return (
        <footer>
            <nav className="nav secondary-nav">
                <ul>{ links.map(([label, href]) => <li key={ label }><a href={ href }>{ label }</a></li>) }</ul>
            </nav>
            {/*<small>&copy; { new Date().getFullYear() } Blockbuster Theatre</small>*/ }
            <small><strong>Disclaimer: This is a demo website - Not for public use</strong></small>
        </footer>
    );
}
