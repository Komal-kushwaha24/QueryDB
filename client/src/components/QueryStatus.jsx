import React from 'react';
import { Loader2, AlertCircle, HelpCircle } from 'lucide-react';

export default function QueryStatus({
  status, // 'idle' | 'generating' | 'generated' | 'executing' | 'completed' | 'clarification' | 'error'
  statusMessage,
  rowCount,
  executionTimeMs,
  summaryText,
}) {
  if (status === 'idle') {
    return null;
  }

  // 1. Loading States
  if (status === 'generating') {
    return (
      <div className="bg-blue-50/80 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 flex items-center gap-3 text-xs sm:text-sm animate-pulse shadow-xs">
        <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
        <span className="font-medium">
          Generating SQL query using schema context...
        </span>
      </div>
    );
  }

  if (status === 'executing') {
    return (
      <div className="bg-indigo-50/80 border border-indigo-200 text-indigo-900 rounded-xl px-4 py-3 flex items-center gap-3 text-xs sm:text-sm animate-pulse shadow-xs">
        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
        <span className="font-medium">
          Validating safety and executing query on PostgreSQL...
        </span>
      </div>
    );
  }

  // 2. Clarification State
  if (status === 'clarification') {
    return (
      <div className="bg-amber-50/90 border border-amber-300 text-amber-900 rounded-xl px-4 py-3 flex items-center gap-3 text-xs sm:text-sm shadow-xs">
        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <div>
          <span className="font-semibold text-amber-950">Clarification Needed: </span>
          <span>Please select an option below to refine your inquiry.</span>
        </div>
      </div>
    );
  }

  // 3. Error State
  if (status === 'error') {
    return (
      <div className="bg-rose-50/90 border border-rose-300 text-rose-900 rounded-xl px-4 py-3 flex items-center gap-3 text-xs sm:text-sm shadow-xs">
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
        <span className="font-medium">
          {statusMessage || 'An error occurred during query generation or execution.'}
        </span>
      </div>
    );
  }

  // 4. Completed / Generated Success State - Matches mockup exactly!
  // E.g.: "● 2 students found. Showing CSE students with package above 15 LPA."
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-4 py-3 flex items-center justify-between text-xs sm:text-sm">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shrink-0"></span>
        <div className="text-slate-800">
          {summaryText ? (
            <span className="font-semibold">{summaryText}</span>
          ) : (
            <>
              <strong className="font-semibold text-slate-900">
                {rowCount !== undefined ? `${rowCount} ${rowCount === 1 ? 'record' : 'records'} found.` : 'Query ready.'}
              </strong>{' '}
              <span className="text-slate-500">
                {statusMessage || 'Showing filtered database records.'}
              </span>
            </>
          )}
        </div>
      </div>

      {executionTimeMs !== undefined && (
        <span className="text-xs text-slate-400 font-mono hidden md:inline">
          {executionTimeMs} ms
        </span>
      )}
    </div>
  );
}
