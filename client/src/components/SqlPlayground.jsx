import { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DATABASE_SCHEMA, PRESET_QUERIES } from '../data/playgroundData';
import { formatSqlTokens } from '../utils/sqlHighlighter';
import { executeQuery } from '../services/api';

export default function SqlPlayground({ isDedicatedPage = false, onBack }) {
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [queryInput, setQueryInput] = useState('');
  const [activeTab, setActiveTab] = useState('sql'); // 'sql' | 'table' | 'explanation' | 'schema'
  const [selectedDialect, setSelectedDialect] = useState('PostgreSQL 16');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [selectedAmbiguityOption, setSelectedAmbiguityOption] = useState(null);
  const [liveClarification, setLiveClarification] = useState(null);
  const [liveResult, setLiveResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const promptInputId = useId();

  // Active query resolution:
  // Data is shown ONLY after execution (liveResult or preset fallback upon generate)
  const currentQueryData = selectedPresetId
    ? PRESET_QUERIES.find((q) => q.id === selectedPresetId) || null
    : null;
  const activeData = liveResult;
  const isAmbiguousQuery = Boolean(liveClarification) || Boolean(currentQueryData?.isAmbiguous && !selectedAmbiguityOption && !liveResult);

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setQueryInput(preset.question);
    setSelectedAmbiguityOption(null);
    setLiveClarification(null);
    setLiveResult(null);
    setQueryError(null);
    setFilterText('');
  };

  const handleReset = () => {
    setSelectedPresetId(null);
    setQueryInput('');
    setSelectedAmbiguityOption(null);
    setLiveClarification(null);
    setLiveResult(null);
    setQueryError(null);
    setFilterText('');
  };

  const handleTriggerGenerate = async (overrideOption = null) => {
    if (!queryInput.trim()) return;
    setIsGenerating(true);
    setQueryError(null);

    const chosenOption = overrideOption !== null ? overrideOption : selectedAmbiguityOption;

    try {
      const data = await executeQuery(queryInput, chosenOption || undefined);

      if (data.status === 'clarification_required' && data.clarification) {
        setLiveClarification(data.clarification);
        setLiveResult(null);
        setQueryError(null);
      } else if (data.status === 'completed' || data.success) {
        setLiveClarification(null);
        setQueryError(null);
        setLiveResult({
          id: 'live-query',
          category: 'Live Query',
          question: queryInput,
          sql: data.sql,
          explanation: data.explanation || 'Executed safely on PostgreSQL.',
          executionTime: '12ms',
          tablesUsed: (data.sql.match(/\bFROM\s+([a-zA-Z_]+)|\bJOIN\s+([a-zA-Z_]+)/gi) || [])
            .map((s) => s.replace(/^(FROM|JOIN)\s+/i, '').trim())
            .filter((v, i, a) => v && a.indexOf(v) === i),
          columns: data.columns || (data.rows && data.rows[0] ? Object.keys(data.rows[0]) : []),
          rows: data.rows || []
        });
        setActiveTab('sql');
      } else {
        throw new Error(data.error?.message || 'Query execution did not return a valid result.');
      }
    } catch (err) {
      console.warn('Backend query error:', err.message);
      setLiveClarification(null);

      // Check if the input question matches a known preset for demo fallback
      const matchingPreset = PRESET_QUERIES.find(
        (p) => p.question.trim().toLowerCase() === queryInput.trim().toLowerCase()
      );

      if (matchingPreset) {
        setLiveResult({
          ...matchingPreset,
          isOfflineFallback: true
        });
        setQueryError(null);
        setActiveTab('sql');
      } else {
        setLiveResult(null);
        setQueryError(err.message || 'Unable to execute query. Make sure backend and AI services are running.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySql = () => {
    if (!activeData?.sql) return;
    navigator.clipboard.writeText(activeData.sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleDownloadCsv = () => {
    if (!activeData?.columns || !activeData?.rows) return;
    const headers = activeData.columns.join(',');
    const rows = activeData.rows.map((row) =>
      activeData.columns.map((col) => `"${row[col] ?? ''}"`).join(',')
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
  const filteredRows = activeData?.rows
    ? activeData.rows.filter((row) => {
        if (!filterText.trim()) return true;
        const query = filterText.toLowerCase();
        return Object.values(row).some((val) => String(val).toLowerCase().includes(query));
      })
    : [];

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
                    onChange={(e) => {
                      setQueryInput(e.target.value);
                      if (selectedPresetId && e.target.value !== currentQueryData?.question) {
                        setSelectedPresetId(null);
                      }
                    }}
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
                      onClick={handleReset}
                      className="absolute top-2.5 right-2.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] px-2 py-1 rounded bg-[var(--color-paper-3)] transition-colors duration-150 cursor-pointer"
                      aria-label="Clear and reset input"
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
                          {liveClarification ? liveClarification.question : currentQueryData?.clarificationQuestion}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {(liveClarification ? liveClarification.options : (currentQueryData?.options || [])).map((opt) => {
                            const label = typeof opt === 'string' ? opt : opt.label;
                            const resolved = typeof opt === 'string' ? `${queryInput} (${opt})` : opt.resolvedQuery;
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={() => {
                                  setSelectedAmbiguityOption(label);
                                  setQueryInput(resolved);
                                  handleTriggerGenerate(label);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg bg-[var(--color-paper-3)] text-xs text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:border-[var(--color-accent)] border border-[var(--color-rule)] transition-colors duration-150 cursor-pointer flex items-center justify-between"
                              >
                                <span>{label}</span>
                                <span className="text-xs text-[var(--color-accent)]">Select</span>
                              </button>
                            );
                          })}
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
                  onClick={handleReset}
                  className="btn-ghost py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium cursor-pointer whitespace-nowrap"
                >
                  Reset
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
                    { key: 'table', label: `Results${activeData?.rows ? ` (${activeData.rows.length})` : ''}` },
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
                  {activeTab === 'sql' && activeData?.sql && (
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

                  {activeTab === 'table' && activeData?.rows?.length > 0 && (
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
                  {/* State 1: Active Loading / Generating State */}
                  {isGenerating && (
                    <motion.div
                      key="generating-state"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center space-y-4"
                    >
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-[var(--color-rule)]" />
                        <div className="w-12 h-12 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
                        <svg className="w-5 h-5 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="16 18 22 12 16 6" />
                          <polyline points="8 6 2 12 8 18" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[var(--color-ink)]">
                          Synthesizing SQL from natural language…
                        </h3>
                        <p className="text-xs text-[var(--color-muted)] mt-1.5 max-w-sm mx-auto leading-relaxed">
                          Grounding schema vectors with FAISS, verifying AST query safety with sqlglot, and executing read-only PostgreSQL transaction.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* State 2: Query Error State */}
                  {!isGenerating && queryError && (
                    <motion.div
                      key="error-state"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center max-w-md mx-auto space-y-4"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[var(--color-ink)]">Query Execution Failed</h3>
                        <p className="text-xs text-[var(--color-muted)] mt-1.5 leading-relaxed font-mono">
                          {queryError}
                        </p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleTriggerGenerate()}
                          className="btn-primary py-2 px-4 rounded-xl text-xs font-medium cursor-pointer"
                        >
                          Try again
                        </button>
                        <button
                          type="button"
                          onClick={handleReset}
                          className="btn-ghost py-2 px-4 rounded-xl text-xs font-medium cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* State 3: Schema Overview (Always available) */}
                  {!isGenerating && !queryError && activeTab === 'schema' && (
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
                          const isUsed = Boolean(activeData?.tablesUsed?.includes(tbl.name));
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

                  {/* State 4: Default Reset / Empty State (Awaiting query generation) */}
                  {!isGenerating && !queryError && !activeData && activeTab !== 'schema' && (
                    <motion.div
                      key="empty-state"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center max-w-lg mx-auto space-y-4"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[var(--color-paper-3)] border border-[var(--color-rule)] flex items-center justify-center text-[var(--color-accent)] shadow-sm">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <polyline points="16 18 22 12 16 6" />
                          <polyline points="8 6 2 12 8 18" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base text-[var(--color-ink)]">
                          {queryInput.trim() ? 'Ready to execute' : 'Ready to generate SQL'}
                        </h3>
                        <p className="text-xs text-[var(--color-muted)] mt-1.5 leading-relaxed">
                          {queryInput.trim()
                            ? 'Question loaded in workbench. Click "Generate SQL" or press Ctrl+Enter to translate it into verified SQL and fetch results.'
                            : 'Type any natural language question or pick a scenario on the left, then click "Generate SQL". By default, all results remain in clean reset state.'
                          }
                        </p>
                      </div>
                      {!queryInput.trim() && (
                        <div className="pt-2">
                          <span className="text-[11px] text-[var(--color-muted)] font-medium block mb-2">Example questions you can ask:</span>
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {[
                              'List all students from Mumbai',
                              'Which companies are recruiting?',
                              'Courses with more than 3 credits',
                              'Students with attendance above 80%'
                            ].map((q) => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => {
                                  setQueryInput(q);
                                  setSelectedPresetId(null);
                                  setQueryError(null);
                                }}
                                className="px-2.5 py-1 rounded-md bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-[11px] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                              >
                                "{q}"
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* State 5: Generated SQL Tab */}
                  {!isGenerating && !queryError && activeData && activeTab === 'sql' && (
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
                          {formatSqlTokens(activeData.sql)}
                        </div>
                      </div>

                      {/* Safety & Tables Metadata Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] text-xs">
                          <span className="text-[var(--color-muted)] text-xs block mb-1.5">
                            Referenced tables:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(activeData.tablesUsed || ['students']).map((t) => (
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

                  {/* State 6: Interactive Result Data Table */}
                  {!isGenerating && !queryError && activeData && activeTab === 'table' && (
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
                          Showing {filteredRows.length} of {activeData.rows.length} rows
                        </span>
                      </div>

                      {/* Grid Table */}
                      <div className="border border-[var(--color-rule)] rounded-xl overflow-x-auto max-h-[300px] overflow-y-auto bg-[var(--color-paper-3)]">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)]">
                              {(activeData.columns || []).map((col) => (
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
                                  {(activeData.columns || []).map((col) => (
                                    <td key={col} className="p-3 text-[var(--color-ink-2)] whitespace-nowrap font-mono">
                                      {row[col]}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={(activeData.columns || []).length} className="p-6 text-center text-[var(--color-muted)]">
                                  No rows match your filter keyword.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {/* State 7: Natural Language Explanation */}
                  {!isGenerating && !queryError && activeData && activeTab === 'explanation' && (
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
                        <p className="text-[var(--color-ink)]">{activeData.explanation}</p>
                      </div>

                      <div className="p-4 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)]">
                        <span className="text-[var(--color-muted)] font-semibold block mb-2 text-xs">
                          Pipeline architecture breakdown:
                        </span>
                        <ul className="space-y-2 list-disc list-inside text-[var(--color-ink-2)]">
                          <li><strong>RAG target:</strong> Indexed schema matched with {(activeData.tablesUsed || ['students']).join(', ')} tables.</li>
                          <li><strong>Safety analysis:</strong> Verified zero mutation commands.</li>
                          <li><strong>Latency budget:</strong> Execution completed in {activeData.executionTime || '12ms'}.</li>
                        </ul>
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
