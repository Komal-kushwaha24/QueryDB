import React from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';

export default function ClarificationPrompt({
  question,
  options = [],
  onSelectOption,
  onCancel,
}) {
  if (!question) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-xl p-5 shadow-xs transition-all">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
          <HelpCircle className="w-5 h-5 text-amber-700" />
        </div>

        <div className="flex-1">
          <h4 className="text-sm font-bold text-amber-950 mb-1">
            Question Needs Clarification
          </h4>
          <p className="text-xs text-amber-900 mb-3 font-medium">
            {question}
          </p>

          <div className="flex flex-wrap gap-2">
            {options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectOption(opt)}
                className="px-3 py-1.5 bg-white hover:bg-amber-100/80 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer hover:border-amber-400"
              >
                <span>{opt}</span>
                <ArrowRight className="w-3 h-3 text-amber-600" />
              </button>
            ))}
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={onCancel}
              className="text-[11px] text-amber-700 hover:text-amber-900 underline cursor-pointer"
            >
              Cancel clarification and rephrase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
