import React, { useState } from 'react';
import { Settings, Shield, Sliders, Trash2, Sun, Moon, Laptop, Check } from 'lucide-react';
import { setForceMockMode, getForceMockMode } from '../services/api.js';

export default function SettingsView({ onClearHistory }) {
  const [theme, setTheme] = useState('light');
  const [rowLimit, setRowLimit] = useState(100);
  const [isMock, setIsMock] = useState(getForceMockMode());
  const [clearedToast, setClearedToast] = useState(false);

  const handleToggleMock = (e) => {
    const val = e.target.checked;
    setIsMock(val);
    setForceMockMode(val);
  };

  const handleClear = () => {
    onClearHistory?.();
    setClearedToast(true);
    setTimeout(() => setClearedToast(false), 2500);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 max-w-3xl space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold text-slate-900">Application Settings</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure interface appearance, execution limits, and safety preferences.
        </p>
      </div>

      <div className="space-y-5 text-xs">
        {/* Theme Preference */}
        <div>
          <label className="block text-slate-700 font-semibold mb-2">
            Appearance & Theme
          </label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark (Beta)', icon: Moon },
              { id: 'system', label: 'System', icon: Laptop },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row Limit per Query */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-slate-700 font-semibold mb-1">
            Row limit per query
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Caps the maximum records returned by PostgreSQL to prevent network saturation.
          </p>
          <select
            value={rowLimit}
            onChange={(e) => setRowLimit(Number(e.target.value))}
            className="w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white text-xs cursor-pointer"
          >
            <option value={50}>50 rows</option>
            <option value={100}>100 rows (Default)</option>
            <option value={250}>250 rows</option>
            <option value={500}>500 rows</option>
          </select>
        </div>

        {/* Data / Mock Mode Toggle */}
        <div className="pt-3 border-t border-slate-100">
          <label className="flex items-center justify-between max-w-md cursor-pointer">
            <div>
              <span className="block text-slate-700 font-semibold">
                Force Demo / Mock API Mode
              </span>
              <span className="text-[11px] text-slate-400">
                When enabled, uses isolated mock datasets instead of sending requests to localhost:3000.
              </span>
            </div>
            <input
              type="checkbox"
              checked={isMock}
              onChange={handleToggleMock}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </label>
        </div>

        {/* Clear Saved Data */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-slate-700 font-semibold mb-1 text-rose-700">
            Clear saved query history
          </label>
          <p className="text-[11px] text-slate-400 mb-3">
            Wipes all past executed queries and starred bookmarks from your local session.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear query history
            </button>

            {clearedToast && (
              <span className="text-emerald-600 font-medium flex items-center gap-1 text-[11px] animate-fadeIn">
                <Check className="w-3.5 h-3.5" />
                History cleared!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
