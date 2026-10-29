import React from 'react';
import { X, Database, Key, Table2 } from 'lucide-react';

export default function DatabaseSchemaModal({ isOpen, onClose, tables = [] }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Database Schema Reference</h3>
              <p className="text-xs text-slate-500">
                My College DB • PostgreSQL (5 active relations)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-5">
          {tables.map((table, tIdx) => (
            <div
              key={tIdx}
              className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
            >
              <div className="px-4 py-2.5 bg-[#0c162d] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono font-bold text-xs">{table.name}</span>
                </div>
                {table.description && (
                  <span className="text-[11px] text-slate-400 font-sans">{table.description}</span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-2 px-3 font-semibold">Column</th>
                      <th className="py-2 px-3 font-semibold">Data Type</th>
                      <th className="py-2 px-3 font-semibold">Attributes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {table.columns.map((col, cIdx) => (
                      <tr key={cIdx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-medium text-slate-800 flex items-center gap-1.5">
                          {col.isPrimaryKey && (
                            <Key className="w-3 h-3 text-amber-500 shrink-0" title="Primary Key" />
                          )}
                          <span>{col.name}</span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">{col.dataType}</td>
                        <td className="py-2 px-3 text-slate-500">
                          {col.isPrimaryKey ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                              PK
                            </span>
                          ) : col.isForeignKey ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                              FK
                            </span>
                          ) : col.isNullable ? (
                            <span className="text-slate-400">nullable</span>
                          ) : (
                            <span className="text-slate-600">not null</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Read-only permissions enforced on this schema</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
