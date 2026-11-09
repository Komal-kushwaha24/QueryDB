import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    q: 'How does QueryDB prevent hallucinated table and column names?',
    a: 'QueryDB embeds table descriptions, column names, data types, and primary/foreign key references into a FAISS dense vector store. When a user asks a question, the top matching schemas are retrieved and injected directly into the LLM system prompt as strict ground truth. The model is explicitly forbidden from referencing tables not in the retrieved context.',
  },
  {
    q: 'What is proactive ambiguity clarification?',
    a: 'Natural language questions often contain subjective terms like "top students" or "best performers." Rather than guessing whether "top" means highest CGPA, highest package, or highest attendance, QueryDB classifies the question as ambiguous and presents selectable options before generating the final query.',
  },
  {
    q: 'Can QueryDB execute destructive queries like DROP TABLE or DELETE?',
    a: 'No. Every query passes through sqlglot AST verification. Any query containing mutating keywords (DROP, DELETE, UPDATE, ALTER, TRUNCATE, INSERT) is rejected at the parser level before reaching the PostgreSQL executor.',
  },
  {
    q: 'Can I export the query results into CSV for analysis?',
    a: 'Yes. The interactive workbench includes an Export CSV button that converts the returned tabular data directly into a downloadable CSV spreadsheet.',
  },
  {
    q: 'Which databases are currently supported?',
    a: 'QueryDB is natively optimized for PostgreSQL 14, 15, and 16, utilizing standard relational semantics, CTEs, and window functions. Dialect selectors also support previewing MySQL 8.0 and Snowflake syntaxes.',
  },
];

const ChevronIcon = ({ open }) => (
  <svg
    className="w-4 h-4 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    style={{
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform var(--dur-short) var(--ease-out)',
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const FaqIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section
      id="faq"
      className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[var(--color-rule)]"
      style={{ backgroundColor: 'var(--color-paper-2)' }}
    >
      <div className="max-w-[840px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full surface-elevated text-xs font-medium text-[var(--color-accent)] border border-[var(--color-rule)] mb-5">
            <FaqIcon />
            <span>Frequently asked questions</span>
          </div>
          <h2
            className="font-display font-semibold text-[var(--color-ink)] mb-4 tracking-tight leading-tight"
            style={{ fontSize: 'clamp(1.75rem, 3vw + 0.5rem, 2.75rem)', textWrap: 'balance' }}
          >
            Common questions about QueryDB
          </h2>
          <p
            className="text-[var(--color-muted)] leading-relaxed"
            style={{ fontSize: 'var(--text-lead)', maxWidth: '52ch', margin: '0 auto' }}
          >
            Schema RAG, security guarantees, and execution safety answered.
          </p>
        </div>

        {/* FAQ accordion */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.q}
                className="surface-card rounded-2xl overflow-hidden"
                style={{ transition: 'border-color var(--dur-short) var(--ease-out)' }}
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  className="w-full px-6 py-5 text-left flex items-start justify-between gap-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
                  style={{ transition: 'background-color var(--dur-short) var(--ease-out)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-paper-3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                >
                  <span className="text-sm font-medium text-[var(--color-ink)] leading-snug mt-0.5">
                    {faq.q}
                  </span>
                  <span className="text-[var(--color-muted)] mt-0.5">
                    <ChevronIcon open={isOpen} />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-6 pb-6 pt-1 text-sm text-[var(--color-muted)] leading-relaxed border-t border-[var(--color-rule)]"
                        style={{ backgroundColor: 'var(--color-paper-2)' }}
                      >
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
