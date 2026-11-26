import { Link } from 'react-router-dom';

const links = [
    ['Home', '/'],
    ['Now Showing', '/now-showing'],
    ['Coming Soon', '/coming-soon'],
    ['About', '/about'],
];

export function Footer() {
    return (
        <footer>
            <nav className="nav secondary-nav">
                <ul>{ links.map(([label, to]) => <li key={ label }><Link to={ to }>{ label }</Link></li>) }</ul>
            </nav>
            {/*<small>&copy; { new Date().getFullYear() } Blockbuster Theatre</small>*/ }
            <small><strong>Disclaimer: This is a demo website - Not for public use</strong></small>
        </footer>
    );
}
