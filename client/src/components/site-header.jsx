import { useState } from 'react';

const links = [
  { label: 'Why QueryDB', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Try the preview', href: '#demo' },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#top" aria-label="QueryDB home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>Query<span className="brand-db">DB</span></span>
        </a>
        <button
          className={`menu-toggle${menuOpen ? ' is-open' : ''}`}
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /><span />
        </button>
        <nav className={`primary-navigation${menuOpen ? ' is-open' : ''}`} id="primary-navigation" aria-label="Main navigation">
          {links.map((link) => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</a>)}
          <a className="nav-github" href="https://github.com/Komal-kushwaha24/QueryDB" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
        </nav>
      </div>
    </header>
  );
}
