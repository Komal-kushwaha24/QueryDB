import { motion } from 'framer-motion';

const activeStack = [
  { name: 'PostgreSQL 14–16', badge: 'Active native engine', active: true },
  { name: 'FAISS Vector RAG', badge: 'Schema grounding' },
  { name: 'SQLGlot AST Guard', badge: 'Read-only gate' },
];

const futureSupport = [
  { name: 'MySQL 8.0', status: 'Coming soon' },
  { name: 'Snowflake', status: 'Coming soon' },
  { name: 'Supabase & Neon', status: 'Planned' },
];

export default function Hero({ onLaunchPlayground }) {
  return (
    <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden flex flex-col items-center justify-center text-center w-full">
      {/* Background radial gradient glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[400px] pointer-events-none opacity-20 blur-[130px] -z-10"
        style={{
          background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-[1240px] mx-auto w-full flex flex-col items-center">
        {/* 1. Status indicator pill */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full surface-elevated text-xs font-medium text-[var(--color-ink-2)] border border-[var(--color-rule)] mb-5 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] inline-block animate-pulse" />
          <span>Text-to-SQL for PostgreSQL</span>
        </motion.div>

        {/* 2. Hero Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display font-bold text-[var(--color-ink)] tracking-tight mb-4 mx-auto max-w-[1100px] w-full text-center"
          style={{
            fontSize: 'clamp(2.125rem, 3.5vw + 0.5rem, 3.75rem)',
            lineHeight: 1.12,
            textWrap: 'balance',
          }}
        >
          Ask your database anything.{' '}
          <br className="hidden sm:inline" />
          Generate{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, var(--color-ink) 20%, var(--color-accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            production SQL
          </span>{' '}
          in seconds.
        </motion.h1>

        {/* 3. Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-base sm:text-lg md:text-[19px] text-[var(--color-muted)] leading-[1.6] mb-7 mx-auto max-w-[620px] w-full text-center"
          style={{ textWrap: 'pretty' }}
        >
          Turn plain English into safe, verified PostgreSQL queries grounded in your live database schema.
        </motion.p>

        {/* 4. Main Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row gap-3.5 justify-center items-center mb-8 w-full"
        >
          <button
            type="button"
            onClick={onLaunchPlayground}
            className="btn-primary w-full sm:w-auto px-7 py-3.5 rounded-xl text-sm font-medium cursor-pointer inline-flex items-center justify-center gap-2.5 shadow-lg"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Open Playground</span>
          </button>

          <a
            href="#schema-explorer"
            className="btn-ghost w-full sm:w-auto px-7 py-3.5 rounded-xl text-sm font-medium cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <span>View Schema</span>
          </a>
        </motion.div>

        {/* 5. Interactive Hero Preview Teaser (text2sql.ai inspired) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="surface-card rounded-2xl border border-[var(--color-rule)] overflow-hidden text-left mb-8 max-w-[880px] w-full mx-auto shadow-2xl shadow-black/40"
        >
          {/* Card Window Bar */}
          <div className="px-4 py-3 border-b border-[var(--color-rule)] bg-[var(--color-paper-3)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-xs text-[var(--color-muted)] font-medium ml-2">
                Live Query Preview
              </span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-paper-2)] text-[var(--color-accent)] border border-[var(--color-rule)] font-medium">
              PostgreSQL 16
            </span>
          </div>

          {/* Prompt Preview */}
          <div className="p-4 sm:p-5 border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
            <span className="text-xs text-[var(--color-muted)] block mb-1.5 font-medium">
              Prompt:
            </span>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--color-paper-2)] border border-[var(--color-rule)]">
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-[var(--color-accent)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                </svg>
                <span className="text-sm text-[var(--color-ink)] font-medium">
                  &ldquo;Show top 5 students placed in Google with package greater than 20 LPA&rdquo;
                </span>
              </div>
              <button
                type="button"
                onClick={onLaunchPlayground}
                className="btn-primary px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer shrink-0 self-end sm:self-auto inline-flex items-center gap-1.5"
              >
                <span>Run</span>
              </button>
            </div>
          </div>

          {/* Generated SQL Output Snippet */}
          <div className="p-4 sm:p-5 bg-[var(--color-paper-2)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--color-muted)] font-medium">
                Generated SQL:
              </span>
              <span className="text-[11px] text-[var(--color-success)] font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
                <span>AST validated &bull; Read-only</span>
              </span>
            </div>
            <pre
              className="p-4 rounded-xl code-container text-xs overflow-x-auto leading-relaxed shadow-inner"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <code>
                <span className="sql-keyword">SELECT</span> s.name, s.department, p.company_name, p.package_lpa{'\n'}
                <span className="sql-keyword">FROM</span> students s{'\n'}
                <span className="sql-keyword">JOIN</span> placements p <span className="sql-keyword">ON</span> s.id = p.student_id{'\n'}
                <span className="sql-keyword">WHERE</span> p.company_name = <span className="sql-string">'Google'</span> <span className="sql-keyword">AND</span> p.package_lpa &gt; <span className="sql-number">20.0</span>{'\n'}
                <span className="sql-keyword">ORDER BY</span> p.package_lpa <span className="sql-keyword">DESC</span>{'\n'}
                <span className="sql-keyword">LIMIT</span> <span className="sql-number">5</span>;
              </code>
            </pre>
          </div>

          {/* Preview Card Footer CTA */}
          <div className="px-5 py-3 border-t border-[var(--color-rule)] bg-[var(--color-paper-3)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <span className="text-[var(--color-ink-2)]">
              Supports ambiguity resolution, live schema inspection, and CSV export.
            </span>
            <button
              type="button"
              onClick={onLaunchPlayground}
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hi)] font-medium shrink-0 inline-flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] rounded py-0.5 whitespace-nowrap"
            >
              <span>Open in playground &rarr;</span>
            </button>
          </div>
        </motion.div>

        {/* 6. Database compatibility & roadmap strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="pt-6 border-t border-[var(--color-rule)] max-w-[880px] w-full mx-auto"
        >
          {/* Active native engine */}
          <div className="mb-3.5">
            <span className="text-xs text-[var(--color-muted)] block mb-2 font-medium">
              Core Stack:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--color-ink-2)]">
              {activeStack.map((item) => (
                <span
                  key={item.name}
                  className="px-3 py-1.5 rounded-lg surface-elevated border border-[var(--color-rule)] font-medium inline-flex items-center gap-2"
                >
                  {item.active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] inline-block animate-pulse" />
                  )}
                  <span>{item.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--color-paper-2)] text-[var(--color-accent)] border border-[var(--color-rule)]">
                    {item.badge}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Future database support */}
          <div>
            <span className="text-[11px] text-[var(--color-muted)]/80 block mb-1.5 font-medium">
              Roadmap:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--color-muted)]">
              {futureSupport.map((item) => (
                <span
                  key={item.name}
                  className="px-2.5 py-1 rounded-lg bg-[var(--color-paper-2)]/60 border border-[var(--color-rule)]/70 font-medium inline-flex items-center gap-1.5 opacity-80"
                >
                  <span>{item.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded surface-elevated text-[var(--color-muted)] border border-[var(--color-rule)]/50">
                    {item.status}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
