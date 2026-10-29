import React, { useState } from 'react';
import { Sparkles, Trash2, ArrowRight, HelpCircle } from 'lucide-react';

export default function QueryInput({
  question,
  setQuestion,
  onGenerate,
  onClear,
  isLoading,
  loadingPhase,
  disabled,
}) {
  const [validationError, setValidationError] = useState('');

  const sampleQuestions = [
    { label: 'CSE > 15 LPA', text: 'Which CSE students got placed above 15 LPA?' },
    { label: 'CGPA > 8.0', text: 'Find students whose CGPA is greater than 8' },
    { label: 'Ambiguous Query', text: 'Show the top students' },
    { label: 'Companies & Offers', text: 'Show all companies that offered placements' },
    { label: 'Empty Results', text: 'Find students with CGPA above 10' },
  ];

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!question || !question.trim()) {
      setValidationError('Please enter a question before asking.');
      return;
    }
    setValidationError('');
    onGenerate(question.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSample = (sampleText) => {
    setQuestion(sampleText);
    setValidationError('');
    onGenerate(sampleText);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 transition-all">
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor="db-query-input"
          className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"
        >
          <span>Ask your database</span>
        </label>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[11px]">Enter ↵</kbd> to ask
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            id="db-query-input"
            rows={2}
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              if (validationError) setValidationError('');
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            placeholder="Which CSE students got placed above 15 LPA?"
            className={`w-full px-4 py-3 bg-slate-50/70 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white text-sm transition-all resize-none ${
              validationError
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
            }`}
          />
        </div>

        {validationError && (
          <p className="text-xs text-rose-600 flex items-center gap-1 font-medium animate-fadeIn">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            {validationError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Quick example question chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-slate-400" /> Examples:
            </span>
            {sampleQuestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(s.text)}
                disabled={isLoading}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {question && (
              <button
                type="button"
                onClick={onClear}
                disabled={isLoading}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                Clear
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-0.5 w-4 h-4 text-white"
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
                  <span>{loadingPhase === 'generating' ? 'Generating SQL...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Ask</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
