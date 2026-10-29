import React, { useState } from 'react';
import { Copy, Check, Play, Terminal, Database } from 'lucide-react';

export default function SqlPreview({
  sql,
  onExecute,
  isExecuting,
  isExecuted,
  executionTimeMs,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!sql) return;
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy SQL:', err);
    }
  };

  if (!sql) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-center items-center min-h-[220px] text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <Terminal className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-slate-600">No SQL generated yet</p>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          Ask a question in natural language above to see AI translate it into PostgreSQL.
        </p>
      </div>
    );
  }

  // Basic syntax highlighter helper for SQL keywords
  const renderHighlightedSql = (rawSql) => {
    return rawSql;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Generated SQL</h3>
            {isExecuted ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Executed {executionTimeMs ? `(${executionTimeMs} ms)` : ''}
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Ready to execute
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
            title="Copy SQL query"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Code Terminal Display */}
        <div className="relative rounded-lg bg-[#0c162d] border border-slate-800 p-4 font-mono text-xs overflow-x-auto shadow-inner min-h-[140px]">
          <pre className="text-emerald-400 font-medium leading-relaxed tracking-wide whitespace-pre-wrap select-all">
            {renderHighlightedSql(sql)}
          </pre>
        </div>
      </div>

      {/* Action footer to execute query */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 flex items-center gap-1">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          Target: PostgreSQL read-only
        </span>

        <button
          type="button"
          onClick={onExecute}
          disabled={isExecuting}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            isExecuted
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs'
          } disabled:opacity-50`}
        >
          {isExecuting ? (
            <>
              <svg
                className="animate-spin -ml-0.5 w-3.5 h-3.5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Executing Query...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isExecuted ? 'Re-run Query' : 'Run Query'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
