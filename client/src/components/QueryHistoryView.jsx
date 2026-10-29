import React from 'react';
import { Star, ArrowUpRight, Play, Terminal, Database } from 'lucide-react';

export default function QueryHistoryView({
  history = [],
  savedIds = [],
  onToggleSave,
  onSelectQuery,
  isSavedView = false,
}) {
  const displayedItems = isSavedView
    ? history.filter((item) => savedIds.includes(item.id))
    : history;

  const renderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
            Success
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs"></span>
          </span>
        );
      case 'clarified':
      case 'clarification':
        return (
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
            Clarified
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-2xs"></span>
          </span>
        );
      case 'blocked':
      case 'rejected':
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
            Blocked
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-2xs"></span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
            {status || 'Completed'}
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header bar matching Page 3 */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {isSavedView ? 'Saved questions' : 'Recent questions'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isSavedView
              ? 'Starred questions saved for quick execution.'
              : 'Lists previous questions with status: Success, Clarified, or Blocked (unsafe SQL).'}
          </p>
        </div>

        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
          {displayedItems.length} {displayedItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {displayedItems.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">
            {isSavedView ? 'No saved queries yet' : 'No query history recorded yet'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {isSavedView
              ? 'Star any query from Query History or New Query to bookmark it here.'
              : 'Run questions from the New Query tab to build your query history.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0c162d] text-white uppercase text-[11px] tracking-wider font-semibold border-b border-slate-800">
                <th className="py-3 px-4 first:pl-6 font-semibold w-8"></th>
                <th className="py-3 px-4 font-semibold">Question</th>
                <th className="py-3 px-4 font-semibold">Database</th>
                <th className="py-3 px-4 font-semibold text-center">Rows</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 last:pr-6 font-semibold">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {displayedItems.map((item) => {
                const isSaved = savedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectQuery(item)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group odd:bg-white even:bg-slate-50/40"
                  >
                    {/* Star toggle */}
                    <td
                      className="py-3.5 px-4 first:pl-6 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave(item.id);
                      }}
                    >
                      <button
                        type="button"
                        className="cursor-pointer transition-transform hover:scale-110"
                        title={isSaved ? 'Remove from saved' : 'Save query'}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isSaved
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300 hover:text-amber-400'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Question text */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span>{item.question}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100" />
                      </div>
                    </td>

                    {/* Database */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {item.database || 'My College DB'}
                    </td>

                    {/* Rows */}
                    <td className="py-3.5 px-4 text-slate-700 font-mono text-center">
                      {item.rows !== undefined && item.rows !== null ? item.rows : '-'}
                    </td>

                    {/* Status with colored dot */}
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* When */}
                    <td className="py-3.5 px-4 last:pr-6 text-slate-500 font-medium">
                      {item.when || 'Just now'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer matching Page 3 mockup */}
      <div className="p-3.5 px-6 border-t border-slate-100 bg-slate-50/80 text-xs text-slate-500 flex items-center justify-between">
        <span>Click a row to re-run it or open its generated SQL.</span>
        <span className="text-[11px] text-slate-400">
          Showing {displayedItems.length} recorded queries
        </span>
      </div>
    </div>
  );
}
