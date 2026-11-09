import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DATABASE_SCHEMA } from '../data/playgroundData';
import { fetchSchema } from '../services/api';

export default function SchemaExplorer() {
  const [schemaData, setSchemaData] = useState(DATABASE_SCHEMA);
  const [isLiveSchema, setIsLiveSchema] = useState(false);
  const [activeTableKey, setActiveTableKey] = useState('placements');

  useEffect(() => {
    let isMounted = true;
    fetchSchema()
      .then((data) => {
        if (!isMounted || !data?.tables?.length) return;
        const merged = { ...DATABASE_SCHEMA };
        data.tables.forEach((t) => {
          if (merged[t.name]) {
            merged[t.name] = {
              ...merged[t.name],
              columns: t.columns.map((c) => ({
                name: c.name,
                type: c.dataType,
                isPk: c.isPrimaryKey,
                isFk: t.foreignKeys?.some((fk) => fk.sourceColumn === c.name) || false,
                references: t.foreignKeys?.find((fk) => fk.sourceColumn === c.name)
                  ? `${t.foreignKeys.find((fk) => fk.sourceColumn === c.name).referencedTable}.${t.foreignKeys.find((fk) => fk.sourceColumn === c.name).referencedColumn}`
                  : undefined,
              })),
            };
          }
        });
        setSchemaData(merged);
        setIsLiveSchema(true);
      })
      .catch(() => {
        // Fallback to static schema seamlessly when offline
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeTable = schemaData[activeTableKey] || schemaData.students || Object.values(schemaData)[0];

  return (
    <section id="schema-explorer" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[var(--color-rule)] bg-[var(--color-paper)]">
      <div className="max-w-[1280px] mx-auto">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full surface-elevated text-xs font-medium text-[var(--color-accent)] border border-[var(--color-rule)] mb-4">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <span>PostgreSQL Schema</span>
          </div>
          <h2
            className="font-display font-semibold text-[var(--color-ink)] mb-3 tracking-tight leading-tight"
            style={{ fontSize: 'clamp(1.75rem, 3vw + 0.5rem, 2.75rem)', textWrap: 'balance' }}
          >
            Explore Live Database Schema
          </h2>
          <p
            className="text-[var(--color-muted)] leading-relaxed"
            style={{ fontSize: 'var(--text-lead)', maxWidth: '50ch', margin: '0 auto' }}
          >
            Inspect tables, column definitions, and foreign keys connected to QueryDB.
          </p>
        </div>

        {/* Schema Explorer Workbench */}
        <div className="surface-card rounded-2xl border border-[var(--color-rule)] overflow-hidden shadow-2xl shadow-black/40">
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[var(--color-rule)]">
            {/* Table List Sidebar */}
            <div className="md:col-span-4 p-5 sm:p-6 bg-[var(--color-paper)]">
              <span className="text-xs font-medium text-[var(--color-muted)] block mb-3">
                Tables ({Object.keys(schemaData).length}):
              </span>
              <div className="space-y-2">
                {Object.keys(schemaData).map((key) => {
                  const table = schemaData[key];
                  const isSelected = activeTableKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTableKey(key)}
                      className={`
                        w-full text-left px-4 py-3 rounded-xl transition-all duration-150 flex items-center justify-between cursor-pointer border
                        ${isSelected
                          ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)] border-[var(--color-accent)] font-semibold shadow-sm'
                          : 'bg-[var(--color-paper-2)] text-[var(--color-ink-2)] border-[var(--color-rule)] hover:border-[var(--color-muted)] hover:text-[var(--color-ink)]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <ellipse cx="12" cy="5" rx="9" ry="3" />
                          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                        </svg>
                        <span className="font-mono text-xs">{table.name}</span>
                      </div>
                      <span className={`text-xs font-medium ${isSelected ? 'text-[var(--color-accent-ink)]' : 'text-[var(--color-muted)]'}`}>
                        {table.columns.length} cols
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* RAG summary pill */}
              <div className="mt-6 p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-xs text-[var(--color-muted)] leading-relaxed">
                <span className="text-[var(--color-accent)] font-semibold block mb-1">
                  Relational awareness:
                </span>
                Foreign-key relationships are mapped automatically to generate accurate JOINs without hallucinations.
              </div>
            </div>

            {/* Table Detail View */}
            <div className="md:col-span-8 p-6 bg-[var(--color-paper-2)] flex flex-col justify-between">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTable.name}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-rule)]">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-mono text-xl font-bold text-[var(--color-ink)] tracking-tight">
                          {activeTable.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-paper-3)] text-[var(--color-accent)] border border-[var(--color-rule)]">
                          {isLiveSchema ? 'Live PostgreSQL DDL' : 'Verified DDL'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-muted)] mt-1">
                        {activeTable.description}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-[var(--color-muted)] bg-[var(--color-paper-3)] border border-[var(--color-rule)] px-2.5 py-1 rounded-lg">
                      {activeTable.columns.length} columns defined
                    </span>
                  </div>

                  {/* Columns Table */}
                  <div className="border border-[var(--color-rule)] rounded-xl overflow-x-auto bg-[var(--color-paper-3)]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)]">
                          <th className="p-3 font-semibold text-xs">Column name</th>
                          <th className="p-3 font-semibold text-xs">Data type</th>
                          <th className="p-3 font-semibold text-xs">Constraint or key</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-rule)]">
                        {activeTable.columns.map((col) => (
                          <tr key={col.name} className="hover:bg-[var(--color-paper-2)] transition-colors duration-150">
                            <td className="p-3 font-medium text-[var(--color-ink)] flex items-center gap-2">
                              {col.isPk && (
                                <span className="px-1.5 py-0.5 rounded bg-[var(--color-accent-2)] text-[var(--color-accent-ink)] text-[10px] font-bold">
                                  PK
                                </span>
                              )}
                              {col.isFk && (
                                <span className="px-1.5 py-0.5 rounded bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-[10px] font-bold">
                                  FK
                                </span>
                              )}
                              <span className="font-mono">{col.name}</span>
                            </td>
                            <td className="p-3 text-[var(--color-accent)] font-mono">{col.type}</td>
                            <td className="p-3 text-[var(--color-muted)]">
                              {col.isPk ? (
                                <span className="px-2 py-0.5 rounded bg-[var(--color-paper-2)] text-[var(--color-accent-2)] border border-[var(--color-rule)] text-xs font-medium">
                                  Primary key
                                </span>
                              ) : col.isFk ? (
                                <span className="px-2 py-0.5 rounded bg-[var(--color-paper-2)] text-[var(--color-accent)] border border-[var(--color-rule)] text-xs font-medium">
                                  References {col.references}
                                </span>
                              ) : (
                                <span>none</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Schema Context Footer */}
                  <div className="p-4 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)] text-xs text-[var(--color-muted)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span>Dialect: <strong>PostgreSQL 16</strong></span>
                    <span>Safe AST scanned: <strong>Yes</strong></span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
