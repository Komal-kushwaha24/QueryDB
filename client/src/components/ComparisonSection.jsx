const rows = [
  {
    capability: 'Database schema awareness',
    genericLlm: 'Hallucinates column names and non-existent tables',
    queryDb: 'FAISS vector indexing strictly bounds queries to verified schema DDL',
  },
  {
    capability: 'Subjective question handling',
    genericLlm: 'Silently assumes ranking metrics without user feedback',
    queryDb: 'Detects ambiguous phrases (e.g. "top") and offers interactive choices',
  },
  {
    capability: 'Multi-table join accuracy',
    genericLlm: 'Frequently fabricates foreign key paths or invents join keys',
    queryDb: 'Embeds foreign key graph edges to produce deterministic JOIN clauses',
  },
  {
    capability: 'Execution safety guards',
    genericLlm: 'No dialect parsing; vulnerable to destructive mutations',
    queryDb: 'AST validation with sqlglot guarantees strict read-only execution',
  },
  {
    capability: 'Query explanation',
    genericLlm: 'Generic text output with high token consumption',
    queryDb: 'Context-aware plain English explanation alongside tabular results',
  },
];

const ScaleIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <line x1="12" y1="3" x2="12" y2="21" />
    <path d="M3 9l4-4 4 4M17 15l4 4-4 4" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
  </svg>
);

export default function ComparisonSection() {
  return (
    <section
      id="comparison"
      className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[var(--color-rule)]"
      style={{ backgroundColor: 'var(--color-paper-2)' }}
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Section header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full surface-elevated text-xs font-medium text-[var(--color-accent)] border border-[var(--color-rule)] mb-5">
            <ScaleIcon />
            <span>Architecture comparison</span>
          </div>
          <h2
            className="font-display font-semibold text-[var(--color-ink)] mb-4 tracking-tight leading-tight"
            style={{ fontSize: 'clamp(1.75rem, 3vw + 0.5rem, 2.75rem)', textWrap: 'balance' }}
          >
            Why schema RAG beats generic chatbot prompts
          </h2>
          <p
            className="text-[var(--color-muted)] leading-relaxed"
            style={{ fontSize: 'var(--text-lead)', maxWidth: '56ch', margin: '0 auto' }}
          >
            Pasting questions directly into general-purpose LLMs leads to syntax errors, wrong joins, and unsafe database modifications.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="surface-card rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-rule)]" style={{ backgroundColor: 'var(--color-paper-3)' }}>
                  <th className="py-4 px-6 text-xs font-medium text-[var(--color-muted)] w-1/4 text-left">
                    Capability
                  </th>
                  <th className="py-4 px-6 text-xs font-medium text-[var(--color-muted)] w-3/8 text-left">
                    Generic LLM / Chatbot
                  </th>
                  <th
                    className="py-4 px-6 text-xs font-medium text-[var(--color-accent)] w-3/8 text-left"
                    style={{ backgroundColor: 'color-mix(in oklch, var(--color-accent) 8%, transparent)' }}
                  >
                    QueryDB engine
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)]">
                {rows.map((row) => (
                  <tr
                    key={row.capability}
                    style={{ transition: 'background-color var(--dur-short) var(--ease-out)' }}
                    className="hover:bg-[var(--color-paper-3)]"
                  >
                    <td className="py-4 px-6 font-medium text-[var(--color-ink-2)] text-sm align-top">
                      {row.capability}
                    </td>
                    <td className="py-4 px-6 text-[var(--color-muted)] text-sm align-top">
                      <div className="flex items-start gap-2.5">
                        <span className="text-[var(--color-error)] font-bold shrink-0 mt-0.5">✕</span>
                        <span>{row.genericLlm}</span>
                      </div>
                    </td>
                    <td
                      className="py-4 px-6 text-sm align-top"
                      style={{ backgroundColor: 'color-mix(in oklch, var(--color-accent) 5%, transparent)' }}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-[var(--color-success)] font-bold shrink-0 mt-0.5">✓</span>
                        <span className="text-[var(--color-ink-2)] font-medium">{row.queryDb}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
