import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { label: 'Pipeline', href: '#how-it-works' },
  { label: 'Schema explorer', href: '#schema-explorer' },
  { label: 'Comparison', href: '#comparison' },
  { label: 'Features', href: '#features' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navbar({ currentView = 'landing', onNavigate }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleGoHome = (e) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('landing');
    }
  };

  const handleLaunchPlayground = (e) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('playground');
    }
  };

  return (
    <header className="fixed top-4 left-4 right-4 z-50">
      <div
        className={`
          max-w-[1280px] mx-auto glass-panel rounded-2xl px-5 sm:px-6 py-3 flex items-center justify-between
          transition-colors duration-200
          ${scrolled ? 'border-[var(--color-muted)]/30' : ''}
        `}
      >
        {/* Brand */}
        <button
          type="button"
          onClick={handleGoHome}
          className="flex items-center gap-3 cursor-pointer group focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] rounded-lg text-left"
        >
          <div className="relative w-8 h-8 rounded-xl bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-accent-ink)] shadow-md group-hover:scale-105 transition-transform duration-150">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display font-medium text-lg text-[var(--color-ink)] tracking-tight">
              QueryDB
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-paper-3)] text-[var(--color-accent)] border border-[var(--color-rule)] font-medium">
              PostgreSQL
            </span>
          </div>
        </button>

        {/* Desktop Links / Workspace State */}
        {currentView === 'landing' ? (
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3.5 py-1.5 text-xs font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] rounded-lg transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full surface-elevated border border-[var(--color-rule)] text-xs font-medium text-[var(--color-ink-2)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] inline-block animate-pulse" />
            <span>Interactive SQL Playground Workspace</span>
          </div>
        )}

        {/* Action Button & GitHub */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://github.com/Komal-kushwaha24/QueryDB"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] bg-[var(--color-paper-3)] border border-[var(--color-rule)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </a>

          {currentView === 'landing' ? (
            <button
              type="button"
              onClick={handleLaunchPlayground}
              className="btn-primary px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
            >
              Launch playground
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoHome}
              className="btn-ghost px-4 py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back to overview</span>
            </button>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="md:hidden p-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden mt-2 p-4 rounded-2xl glass-panel space-y-2 shadow-2xl"
          >
            {currentView === 'landing' ? (
              <>
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] rounded-lg transition-colors duration-150"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="pt-2 border-t border-[var(--color-rule)] flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      setMenuOpen(false);
                      handleLaunchPlayground(e);
                    }}
                    className="btn-primary w-full text-center py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Launch playground
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-1 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    setMenuOpen(false);
                    handleGoHome(e);
                  }}
                  className="btn-ghost w-full text-center py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                >
                  &larr; Back to overview
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
