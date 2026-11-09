import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const features = [
  {
    title: 'Zero-Hallucination Schema RAG',
    description: 'FAISS dense vector embeddings strictly ground every query in real PostgreSQL table DDL. The model never references imaginary tables or non-existent columns.',
    tag: 'FAISS + Dense Vector',
  },
  {
    title: 'Proactive Ambiguity Clarification',
    description: 'Detects subjective terminology like "top", "active", or "best" and prompts for explicit user selection before executing ambiguous SQL.',
    tag: 'Novel Capability',
  },
  {
    title: 'AST-Level Read-Only Security',
    description: 'Every query is parsed into an abstract syntax tree via sqlglot. Destructive operations (DROP, ALTER, TRUNCATE, DELETE) are permanently blocked.',
    tag: 'Safety Guard',
  },
  {
    title: 'Multi-Table Relational JOINs',
    description: 'Foreign key paths between students, placements, companies, and courses are embedded so complex multi-table queries resolve correctly.',
    tag: 'Graph Traversal',
  },
  {
    title: 'Transparent Query Explanations',
    description: 'Translates the generated SQL back into plain English, walking through filters, joins, and aggregations so non-technical users can verify intent.',
    tag: 'Audit Ready',
  },
  {
    title: 'Live Tabular Export & Search',
    description: 'Inspect execution results in an interactive data table with in-memory filtering, column ordering, and one-click CSV export.',
    tag: 'Analytics',
  },
];

const ShieldIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export default function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section
      id="features"
      className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[var(--color-rule)]"
      style={{ backgroundColor: 'var(--color-paper)' }}
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Section header */}
        <div ref={ref} className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full surface-elevated text-xs font-medium text-[var(--color-accent)] border border-[var(--color-rule)] mb-5">
            <ShieldIcon />
            <span>Engine capabilities</span>
          </div>
          <h2
            className="font-display font-semibold text-[var(--color-ink)] mb-4 tracking-tight leading-tight"
            style={{ fontSize: 'clamp(1.75rem, 3vw + 0.5rem, 2.75rem)', textWrap: 'balance' }}
          >
            Engineered for precision and security
          </h2>
          <p
            className="text-[var(--color-muted)] leading-relaxed"
            style={{ fontSize: 'var(--text-lead)', maxWidth: '56ch', margin: '0 auto' }}
          >
            Traditional LLM chatbots generate invalid SQL with high hallucination rates. QueryDB couples vector RAG with compiler-grade AST validation.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="p-6 rounded-2xl surface-card flex flex-col justify-between group"
              style={{
                transition: 'border-color var(--dur-short) var(--ease-out)',
              }}
            >
              <div>
                {/* Tag badge */}
                <span
                  className="inline-block text-[11px] font-medium px-2.5 py-1 rounded-md surface-elevated text-[var(--color-accent)] mb-4"
                >
                  {feature.tag}
                </span>
                <h3 className="text-base font-semibold text-[var(--color-ink)] mb-2 leading-snug">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-[var(--color-rule)] flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-success)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
                <span>Production verified</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
