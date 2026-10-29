import React from 'react';
import { AlertTriangle, RefreshCw, XCircle, ShieldAlert } from 'lucide-react';

export default function ErrorMessage({ error, onRetry, onDismiss }) {
  if (!error) return null;

  const isUnsafe = error.code === 'UNSAFE_QUERY';
  const isNetwork = error.code === 'NETWORK_ERROR' || error.message?.includes('fetch');

  return (
    <div className="bg-rose-50 border border-rose-200/90 rounded-xl p-4 sm:p-5 shadow-xs transition-all animate-fadeIn">
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
          {isUnsafe ? (
            <ShieldAlert className="w-5 h-5 text-rose-700" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-700" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-sm font-bold text-rose-900">
              {isUnsafe
                ? 'Security Safety Check Failed'
                : isNetwork
                ? 'Connection Issue'
                : 'Query Processing Error'}
            </h4>
            {error.code && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-200/70 text-rose-800">
                {error.code}
              </span>
            )}
          </div>

          <p className="text-xs text-rose-800 leading-relaxed">
            {error.message || 'An unexpected error occurred while processing the query.'}
          </p>

          {isUnsafe && (
            <div className="mt-2 text-[11px] text-rose-700 bg-rose-100/60 p-2 rounded border border-rose-200">
              <strong>QueryDB Policy:</strong> Only read-only <code>SELECT</code> statements are authorized. <code>DROP</code>, <code>DELETE</code>, <code>UPDATE</code>, and destructive DDL/DML are prohibited by database security gates.
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="px-3 py-1.5 bg-white hover:bg-rose-100/60 text-rose-700 border border-rose-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
