import React from 'react';
import { CheckCircle2, ShieldCheck, Filter, Table2, Info } from 'lucide-react';

export default function QueryUnderstanding({ understanding, explanation }) {
  if (!understanding && !explanation) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-center items-center min-h-[220px] text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <Info className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-slate-600">No question parsed yet</p>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          When you enter a natural-language query, we will display how the AI broke down tables, filters, and safety constraints.
        </p>
      </div>
    );
  }

  const tables = understanding?.tables || ['students'];
  const filters = understanding?.filters || [];
  const ambiguityCheck = understanding?.ambiguityCheck || 'Clear - no question needed';
  const safetyCheck = understanding?.safetyCheck || 'SELECT only - passed';

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <span>How we understood your question</span>
        </h3>

        <div className="space-y-3 text-xs">
          {/* Tables used */}
          <div>
            <span className="text-slate-400 font-medium block mb-0.5 flex items-center gap-1">
              <Table2 className="w-3.5 h-3.5 text-slate-400" />
              Tables used
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tables.map((t, idx) => (
                <span
                  key={idx}
                  className="font-mono font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Filters */}
          {filters.length > 0 && (
            <div>
              {filters.map((f, idx) => (
                <div key={idx} className="mb-2">
                  <span className="text-slate-400 font-medium block mb-0.5 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    Filter {idx + 1}
                  </span>
                  <p className="font-mono font-semibold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200/60 inline-block">
                    {f}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Ambiguity Check */}
          <div>
            <span className="text-slate-400 font-medium block mb-0.5">Ambiguity check</span>
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {ambiguityCheck}
            </p>
          </div>

          {/* Safety Check */}
          <div>
            <span className="text-slate-400 font-medium block mb-0.5">Safety check</span>
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {safetyCheck}
            </p>
          </div>
        </div>
      </div>

      {/* Explanation text */}
      {explanation && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-2.5 rounded-lg border border-slate-200/50">
            "{explanation}"
          </p>
        </div>
      )}
    </div>
  );
}
