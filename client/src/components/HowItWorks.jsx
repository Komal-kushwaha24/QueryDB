import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const steps = [
  {
    step: '01',
    title: 'Question Submission',
    description: 'The user submits a question in plain English, describing what data they need without knowing SQL syntax.',
  },
  {
    step: '02',
    title: 'Ambiguity Classification',
    description: 'The query analyzer evaluates whether subjective terms like "top" or "active" need explicit user selection.',
  },
  {
    step: '03',
    title: 'Schema RAG Retrieval',
    description: 'FAISS vector indexing matches the prompt against table descriptions, pulling relevant schemas and foreign key paths.',
  },
  {
    step: '04',
    title: 'Text-to-SQL Synthesis',
    description: 'The LLM generates standard PostgreSQL with constrained tables, schema context, and strict SELECT requirements.',
  },
  {
    step: '05',
    title: 'AST Security Gate',
    description: 'sqlglot parses the query into an abstract syntax tree, verifying read-only safety and rejecting mutation attempts.',
  },
  {
    step: '06',
    title: 'Execution & Explanation',
    description: 'PostgreSQL executes the read-only query within strict timeouts, returning clean tabular rows and a natural explanation.',
  },
];

const PipelineIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export default function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section
      id="how-it-works"
      className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[var(--color-rule)]"
      style={{ backgroundColor: 'var(--color-paper-2)' }}
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Section header */}
        <div ref={ref} className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full surface-elevated text-xs font-medium text-[var(--color-accent)] border border-[var(--color-rule)] mb-5">
            <PipelineIcon />
            <span>Execution pipeline</span>
          </div>
          <h2
            className="font-display font-semibold text-[var(--color-ink)] mb-4 tracking-tight leading-tight"
            style={{ fontSize: 'clamp(1.75rem, 3vw + 0.5rem, 2.75rem)', textWrap: 'balance' }}
          >
            Six disciplined stages from question to data
          </h2>
          <p
            className="text-[var(--color-muted)] leading-relaxed"
            style={{ fontSize: 'var(--text-lead)', maxWidth: '56ch', margin: '0 auto' }}
          >
            QueryDB never sends raw user queries directly to the database. Each prompt passes six validation and enrichment phases.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((item, index) => (
            <motion.div
              key={item.step}
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
                {/* Step number */}
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="text-2xl font-bold text-[var(--color-accent)] opacity-70"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {item.step}
                  </span>
                  <span
                    className="text-[11px] px-2.5 py-1 rounded-md surface-elevated text-[var(--color-muted)] border border-[var(--color-rule)] font-medium"
                  >
                    Phase {index + 1}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[var(--color-ink)] mb-2 leading-snug">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-[var(--color-rule)] flex items-center gap-1.5 text-xs text-[var(--color-accent)] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                <span>Verified pipeline stage</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
