import React, { useState } from 'react';
import { Download, ChevronDown, ChevronUp, Table, Clock, Layers } from 'lucide-react';

export default function QueryResults({
  columns = [],
  rows = [],
  rowCount,
  executionTimeMs,
  retrievedContext = [],
  isExecuted,
}) {
  const [showContext, setShowContext] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  if (!isExecuted) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-center items-center min-h-[200px] text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <Table className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-slate-600">Query results will appear here</p>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Once SQL is generated, click <strong>"Run Query"</strong> to execute the approved query against the PostgreSQL database.
        </p>
      </div>
    );
  }

  // Handle Export CSV
  const handleExportCsv = () => {
    if (!rows || rows.length === 0) return;
    const headerRow = columns.join(',');
    const dataRows = rows.map((r) =>
      columns.map((c) => {
        const val = r[c] !== undefined && r[c] !== null ? String(r[c]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...dataRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `query_results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(rows.length / pageSize) || 1;
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Capitalize column header for display
  const formatColumnHeader = (col) => {
    return col
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900">Results</h3>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
            {rows.length} {rows.length === 1 ? 'row' : 'rows'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
          {executionTimeMs !== undefined && (
            <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Execution Time: <strong className="text-slate-700">{executionTimeMs} ms</strong>
            </span>
          )}
        </div>
      </div>

      {/* Table Content */}
      {rows.length === 0 ? (
        <div className="p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-2">
            <Table className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No records found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            The query executed successfully, but no rows matched the specified criteria in PostgreSQL.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0c162d] text-white uppercase text-[11px] tracking-wider font-semibold border-b border-slate-800">
                {columns.map((col, idx) => (
                  <th key={idx} className="py-3 px-4 first:pl-6 last:pr-6 font-semibold">
                    {formatColumnHeader(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {paginatedRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-blue-50/40 transition-colors odd:bg-white even:bg-slate-50/50"
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      className="py-3 px-4 first:pl-6 last:pr-6 font-medium text-slate-700"
                    >
                      {row[col] !== undefined && row[col] !== null ? (
                        String(row[col])
                      ) : (
                        <span className="text-slate-300 italic">null</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination if needed */}
      {totalPages > 1 && (
        <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/60">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, rows.length)} of {rows.length} rows
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 py-1 font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Footer bar matching mockup */}
      <div className="p-3 sm:px-6 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          {retrievedContext.length > 0 && (
            <button
              type="button"
              onClick={() => setShowContext(!showContext)}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Retrieved context [{showContext ? 'Hide' : 'Show'}]</span>
              {showContext ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {retrievedContext.length > 0 && <span className="text-slate-300">|</span>}
          {rows.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>

        <span className="text-slate-400 text-[11px]">
          Direct PostgreSQL connection bypassed (API mediated)
        </span>
      </div>

      {/* Collapsible Retrieved Context Drawer */}
      {showContext && retrievedContext.length > 0 && (
        <div className="p-4 bg-slate-900 text-slate-200 text-xs font-mono border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-blue-400 font-semibold mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Retrieved Schema & Context (RAG Vector Store)</span>
          </div>
          <ul className="space-y-1 text-slate-300 pl-4 list-disc">
            {retrievedContext.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
