import { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DATABASE_SCHEMA, PRESET_QUERIES } from '../data/playgroundData';
import { formatSqlTokens } from '../utils/sqlHighlighter';

export default function SqlPlayground({ isDedicatedPage = false, onBack }) {
  const [selectedPresetId, setSelectedPresetId] = useState('cgpa-leaders');
  const [queryInput, setQueryInput] = useState(PRESET_QUERIES[0].question);
  const [activeTab, setActiveTab] = useState('sql'); // 'sql' | 'table' | 'explanation' | 'schema'
  const [selectedDialect, setSelectedDialect] = useState('PostgreSQL 16');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [selectedAmbiguityOption, setSelectedAmbiguityOption] = useState(null);
  const [filterText, setFilterText] = useState('');
  const promptInputId = useId();

  // Active query resolution
  const currentQueryData =
    PRESET_QUERIES.find((q) => q.id === selectedPresetId) || PRESET_QUERIES[0];
  const isAmbiguousQuery = currentQueryData.isAmbiguous && !selectedAmbiguityOption;

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setQueryInput(preset.question);
    setSelectedAmbiguityOption(null);
    setFilterText('');
  };

  const handleTriggerGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 350);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(currentQueryData.sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleDownloadCsv = () => {
    const headers = currentQueryData.columns.join(',');
    const rows = currentQueryData.rows.map((row) =>
      currentQueryData.columns.map((col) => `"${row[col]}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `querydb_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter rows for Table tab
  const filteredRows = currentQueryData.rows.filter((row) => {
    if (!filterText.trim()) return true;
    const query = filterText.toLowerCase();
    return Object.values(row).some((val) => String(val).toLowerCase().includes(query));
  });

  return (
    <section id="demo" className={`px-4 sm:px-6 lg:px-8 ${isDedicatedPage ? 'pt-28 pb-20' : 'py-20 border-t border-[var(--color-rule)]'}`}>
      <div className="max-w-[1280px] mx-auto">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-10">
          {isDedicatedPage && onBack && (
            <div className="mb-4">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl surface-card text-xs font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] border border-[var(--color-rule)] cursor-pointer"
                style={{ transition: 'all var(--dur-short) var(--ease-out)' }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Back to overview</span>
              </button>
            </div>
          )}

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full surface-elevated text-xs font-medium text-[var(--color-accent)] border border-[var(--color-rule)] mb-4">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>{isDedicatedPage ? 'Dedicated SQL generation workspace' : 'Interactive text-to-SQL workbench'}</span>
          </div>

          <h2
            className="font-display font-semibold text-[var(--color-ink)] mb-3 tracking-tight leading-tight"
            style={{ fontSize: 'clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem)', textWrap: 'balance' }}
          >
            {isDedicatedPage ? 'Ask your database anything' : 'Schema-aware SQL generation in real time'}
          </h2>

          <p
            className="text-[var(--color-muted)] leading-relaxed"
            style={{ fontSize: 'var(--text-lead)', maxWidth: '56ch', margin: '0 auto' }}
          >
            {isDedicatedPage
              ? 'Type a custom question or pick a scenario below. QueryDB resolves ambiguity, grounds queries in live PostgreSQL DDL, and prevents hallucinations.'
              : 'Test natural language queries against our verified student database schema. Inspect SQL syntax, execution safety guards, and live tabular output.'
            }
          </p>
        </div>

        {/* Workbench Frame */}
        <div className="surface-card rounded-2xl border border-[var(--color-rule)] overflow-hidden">
          {/* Top Control Bar */}
          <div className="px-5 sm:px-6 py-3.5 border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] flex flex-wrap items-center justify-between gap-4">
            {/* Dialect Selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[var(--color-muted)]">Active dialect:</span>
              <div className="flex items-center gap-1 bg-[var(--color-paper-3)] p-1 rounded-lg border border-[var(--color-rule)]">
                {[
                  { name: 'PostgreSQL 16', tag: 'Active' },
                  { name: 'MySQL 8.0', tag: 'Preview' },
                  { name: 'Snowflake', tag: 'Preview' },
                ].map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedDialect(item.name)}
                    className={`
                      px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5
                      ${selectedDialect === item.name
                        ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                      }
                    `}
                  >
                    <span>{item.name}</span>
                    <span className={`text-[10px] px-1 py-0.5 rounded ${selectedDialect === item.name ? 'bg-[var(--color-accent-ink)]/20 text-[var(--color-accent-ink)]' : 'bg-[var(--color-paper-2)] text-[var(--color-muted)]'}`}>
                      {item.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Security & RAG Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-paper-3)] text-[var(--color-ink-2)] text-xs font-medium border border-[var(--color-rule)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] inline-block" />
                <span>Read-only enforced</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-paper-3)] text-[var(--color-accent)] text-xs font-medium border border-[var(--color-rule)]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <span>5 tables indexed</span>
              </span>
            </div>
          </div>

          {/* Workbench Grid: Input Left, Results Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-rule)]">
            {/* Left Column: Natural Language Input & Presets */}
            <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-5 bg-[var(--color-paper)]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor={promptInputId}
                    className="text-xs font-medium text-[var(--color-ink)] block"
                  >
                    Natural language question
                  </label>
                  <span className="text-xs text-[var(--color-muted)]">
                    Press Ctrl+Enter
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    id={promptInputId}
                    rows={4}
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleTriggerGenerate();
                      }
                    }}
                    placeholder="Ask a question about students, courses, placements, or attendance…"
                    className="w-full p-3.5 rounded-xl bg-[var(--color-paper-2)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] border border-[var(--color-rule)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] resize-none leading-relaxed font-medium"
                  />
                  {queryInput && (
                    <button
                      type="button"
                      onClick={() => setQueryInput('')}
                      className="absolute top-2.5 right-2.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] px-2 py-1 rounded bg-[var(--color-paper-3)] transition-colors duration-150 cursor-pointer"
                      aria-label="Clear input text"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Ambiguity Alert Banner */}
                {isAmbiguousQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[var(--color-paper-2)] border border-[var(--color-rule)] border-l-2 border-l-[var(--color-accent-2)]"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-accent-2)] mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-[var(--color-accent-2)] block mb-1">
                          Clarification required
                        </span>
                        <p className="text-xs text-[var(--color-ink-2)] mb-3 leading-relaxed">
                          {currentQueryData.clarificationQuestion}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {currentQueryData.options.map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => {
                                setSelectedAmbiguityOption(opt.label);
                                setQueryInput(opt.resolvedQuery);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg bg-[var(--color-paper-3)] text-xs text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:border-[var(--color-accent)] border border-[var(--color-rule)] transition-colors duration-150 cursor-pointer flex items-center justify-between"
                            >
                              <span>{opt.label}</span>
                              <span className="text-xs text-[var(--color-accent)]">Select</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Preset Prompt Pills */}
                <div className="mt-5">
                  <span className="text-xs text-[var(--color-muted)] block mb-2">
                    Curated question scenarios:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_QUERIES.map((preset) => {
                      const isSelected = selectedPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer border text-left
                            ${isSelected
                              ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)] border-[var(--color-accent)]'
                              : 'bg-[var(--color-paper-2)] text-[var(--color-ink-2)] border-[var(--color-rule)] hover:border-[var(--color-muted)] hover:text-[var(--color-ink)]'
                            }
                          `}
                        >
                          <span className={isSelected ? 'text-[var(--color-accent-ink)] font-semibold' : 'text-[var(--color-muted)]'}>
                            {preset.category}:
                          </span>{' '}
                          <span>{preset.question}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[var(--color-rule)] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTriggerGenerate}
                  disabled={isGenerating || !queryInput.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                  className="btn-primary flex-1 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-medium cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {isGenerating ? (
                    <span className="whitespace-nowrap">Generating SQL…</span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      <span className="whitespace-nowrap">Generate SQL</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('explanation')}
                  className="btn-ghost py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium cursor-pointer whitespace-nowrap"
                >
                  Explain
                </button>
              </div>
            </div>

            {/* Right Column: Output Tabs & Viewer */}
            <div className="lg:col-span-7 flex flex-col justify-between bg-[var(--color-paper-2)]">
              {/* Tab Navigation Header */}
              <div className="px-4 sm:px-6 py-3 border-b border-[var(--color-rule)] flex flex-wrap items-center justify-between gap-3 bg-[var(--color-paper)]">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {[
                    { key: 'sql', label: 'Generated SQL' },
                    { key: 'table', label: `Results (${currentQueryData.rows.length})` },
                    { key: 'explanation', label: 'Plain explanation' },
                    { key: 'schema', label: 'Schema' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`
                        px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 cursor-pointer
                        ${activeTab === tab.key
                          ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)]'
                        }
                      `}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Right Tab Actions */}
                <div className="flex items-center gap-2">
                  {activeTab === 'sql' && (
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="px-3 py-1 rounded-lg bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-xs text-[var(--color-ink)] hover:text-[var(--color-accent)] transition-colors duration-150 cursor-pointer flex items-center gap-1.5 font-medium"
                    >
                      {copiedSql ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy SQL</span>
                        </>
                      )}
                    </button>
                  )}

                  {activeTab === 'table' && (
                    <button
                      type="button"
                      onClick={handleDownloadCsv}
                      className="px-3 py-1 rounded-lg bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-xs text-[var(--color-ink)] hover:text-[var(--color-accent)] transition-colors duration-150 cursor-pointer flex items-center gap-1.5 font-medium"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tab Display Area */}
              <div className="p-5 sm:p-6 flex-1 min-h-[380px] flex flex-col justify-start">
                <AnimatePresence mode="wait">
                  {/* TAB 1: SQL Code Viewer */}
                  {activeTab === 'sql' && (
                    <motion.div
                      key="sql-tab"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4"
                    >
                      <div className="rounded-xl code-container p-4 overflow-x-auto text-xs leading-relaxed font-mono">
                        <div className="table w-full">
                          {formatSqlTokens(currentQueryData.sql)}
                        </div>
                      </div>

                      {/* Safety & Tables Metadata Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] text-xs">
                          <span className="text-[var(--color-muted)] text-xs block mb-1.5">
                            Referenced tables:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {currentQueryData.tablesUsed.map((t) => (
                              <span key={t} className="px-2 py-0.5 rounded bg-[var(--color-paper-3)] text-[var(--color-accent)] font-mono text-xs">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] text-xs">
                          <span className="text-[var(--color-muted)] text-xs block mb-1.5">
                            SQL safety verification:
                          </span>
                          <span className="text-[var(--color-ink)] font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] inline-block" />
                            Passed sqlglot AST verification (SELECT only)
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: Interactive Result Data Table */}
                  {activeTab === 'table' && (
                    <motion.div
                      key="table-tab"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3"
                    >
                      {/* Filter Search */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <input
                          type="text"
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          placeholder="Search in returned rows…"
                          aria-label="Search in returned rows"
                          className="px-3 py-1.5 rounded-lg bg-[var(--color-paper-3)] text-xs text-[var(--color-ink)] placeholder:text-[var(--color-muted)] border border-[var(--color-rule)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] w-64 font-medium"
                        />
                        <span className="text-xs text-[var(--color-muted)]">
                          Showing {filteredRows.length} of {currentQueryData.rows.length} rows
                        </span>
                      </div>

                      {/* Grid Table */}
                      <div className="border border-[var(--color-rule)] rounded-xl overflow-x-auto max-h-[300px] overflow-y-auto bg-[var(--color-paper-3)]">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)]">
                              {currentQueryData.columns.map((col) => (
                                <th key={col} className="p-3 font-semibold text-xs">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-rule)]">
                            {filteredRows.length > 0 ? (
                              filteredRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-[var(--color-paper-2)] transition-colors duration-150">
                                  {currentQueryData.columns.map((col) => (
                                    <td key={col} className="p-3 text-[var(--color-ink-2)] whitespace-nowrap font-mono">
                                      {row[col]}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={currentQueryData.columns.length} className="p-6 text-center text-[var(--color-muted)]">
                                  No rows match your filter keyword.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: Natural Language Explanation */}
                  {activeTab === 'explanation' && (
                    <motion.div
                      key="explanation-tab"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4 text-xs sm:text-sm text-[var(--color-ink-2)] leading-relaxed"
                    >
                      <div className="p-4 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)]">
                        <span className="text-[var(--color-accent)] font-semibold block mb-1 text-xs">
                          Query objective and intent:
                        </span>
                        <p className="text-[var(--color-ink)]">{currentQueryData.explanation}</p>
                      </div>

                      <div className="p-4 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)]">
                        <span className="text-[var(--color-muted)] font-semibold block mb-2 text-xs">
                          Pipeline architecture breakdown:
                        </span>
                        <ul className="space-y-2 list-disc list-inside text-[var(--color-ink-2)]">
                          <li><strong>RAG target:</strong> Indexed schema matched with {currentQueryData.tablesUsed.join(', ')} tables.</li>
                          <li><strong>Safety analysis:</strong> Verified zero mutation commands.</li>
                          <li><strong>Latency budget:</strong> Execution completed in {currentQueryData.executionTime || '12ms'}.</li>
                        </ul>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 4: Live Schema Overview */}
                  {activeTab === 'schema' && (
                    <motion.div
                      key="schema-tab"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3"
                    >
                      <span className="text-xs text-[var(--color-muted)] block mb-2 font-medium">
                        Available tables in demo database:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Object.keys(DATABASE_SCHEMA).map((tblKey) => {
                          const tbl = DATABASE_SCHEMA[tblKey];
                          const isUsed = currentQueryData.tablesUsed.includes(tbl.name);
                          return (
                            <div
                              key={tbl.name}
                              className={`p-3 rounded-xl border text-xs transition-colors duration-150 ${
                                isUsed
                                  ? 'bg-[var(--color-paper-3)] border-[var(--color-accent)] text-[var(--color-ink)]'
                                  : 'bg-[var(--color-paper)] border-[var(--color-rule)] text-[var(--color-muted)]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-mono font-semibold text-[var(--color-ink)]">{tbl.name}</span>
                                {isUsed && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium">
                                    in query
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--color-muted)]">{tbl.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
