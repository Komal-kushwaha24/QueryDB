import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export default function ClarificationPrompt({
  question,
  clarificationQuestion,
  options = [],
  onSelectOption,
  onCancel,
}) {
  const defaultOptions = options.length > 0 ? options : [
    'Highest CGPA',
    'Highest placement package',
    'Best attendance',
  ];

  const [selectedOption, setSelectedOption] = useState(defaultOptions[0] || 'Highest CGPA');
  const [customText, setCustomText] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  // Extract ambiguous term from question or prompt (e.g., "best students")
  const headingText = clarificationQuestion || 'What do you mean by "best students"?';

  const handleContinue = () => {
    if (isCustom) {
      if (!customText.trim()) return;
      onSelectOption(customText.trim());
    } else {
      onSelectOption(selectedOption);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden">
        {/* Yellow Header Banner matching Page 2 */}
        <div className="bg-[#fef3c7] px-6 py-4 border-b border-amber-200/80 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
            ?
          </div>
          <h3 className="text-base font-bold text-amber-950 tracking-tight">
            I need a small clarification
          </h3>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <h4 className="text-sm sm:text-base font-bold text-slate-900">
            {headingText}
          </h4>

          {/* Radio Options List */}
          <div className="space-y-2.5">
            {defaultOptions.map((opt, idx) => {
              const isSelected = !isCustom && selectedOption === opt;
              return (
                <label
                  key={idx}
                  onClick={() => {
                    setIsCustom(false);
                    setSelectedOption(opt);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/70 text-blue-950 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-blue-600 bg-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    )}
                  </div>
                  <span>{opt}</span>
                </label>
              );
            })}

            {/* "Something else (type it)" option */}
            <label
              onClick={() => setIsCustom(true)}
              className={`w-full flex flex-col gap-2 px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                isCustom
                  ? 'border-blue-500 bg-blue-50/70 text-blue-950 shadow-2xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isCustom
                      ? 'border-blue-600 bg-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isCustom && (
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  )}
                </div>
                <span>Something else (type it)</span>
              </div>

              {isCustom && (
                <div className="pl-7 pt-1">
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Specify criteria (e.g. highest projects completed)"
                    autoFocus
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              )}
            </label>
          </div>

          {/* Action buttons matching Page 2 mockup */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={isCustom && !customText.trim()}
              className="px-6 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
