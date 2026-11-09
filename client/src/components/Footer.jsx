const techStack = ['PostgreSQL 16', 'FAISS RAG', 'SQLGlot AST', 'FastAPI + React 19'];

const navLinks = [
  { label: 'Playground', href: '#playground' },
  { label: 'Schema Explorer', href: '#schema-explorer' },
  { label: 'Pipeline', href: '#how-it-works' },
  { label: 'Comparison', href: '#comparison' },
  { label: 'Features', href: '#features' },
  { label: 'FAQ', href: '#faq' },
];

const DbIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const GhIcon = () => (
  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export default function Footer() {
  return (
    <footer
      className="border-t border-[var(--color-rule)] py-12 px-6"
      style={{ backgroundColor: 'var(--color-paper-2)' }}
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b border-[var(--color-rule)]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-accent-ink)]" style={{ backgroundColor: 'var(--color-accent)' }}>
                <DbIcon />
              </div>
              <span className="font-display font-semibold text-base text-[var(--color-ink)] tracking-tight">
                QueryDB
              </span>
            </div>
            <p className="text-sm text-[var(--color-muted)]">
              Ask your data. Get your answers.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
                style={{ transition: 'color var(--dur-short) var(--ease-out)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://github.com/Komal-kushwaha24/QueryDB"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
              style={{ transition: 'color var(--dur-short) var(--ease-out)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-ink)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
            >
              <GhIcon />
              <span>GitHub</span>
            </a>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
          {/* Tech stack badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 rounded-md text-[11px] text-[var(--color-muted)] surface-elevated border border-[var(--color-rule)]"
              >
                {tech}
              </span>
            ))}
          </div>

          <p className="text-xs text-[var(--color-muted)]">
            &copy; {new Date().getFullYear()} QueryDB. Production-grade SQL generation platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
