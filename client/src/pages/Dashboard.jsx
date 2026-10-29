import React, { useState, useEffect } from 'react';
import {
  fetchDatabaseHealth,
  fetchDatabaseSchema,
  generateSqlApi,
  executeQueryApi,
  clarifyQuestion,
  setForceMockMode,
  getForceMockMode,
} from '../services/api.js';

import Sidebar from '../components/Sidebar.jsx';
import QueryInput from '../components/QueryInput.jsx';
import SqlPreview from '../components/SqlPreview.jsx';
import QueryUnderstanding from '../components/QueryUnderstanding.jsx';
import QueryResults from '../components/QueryResults.jsx';
import QueryStatus from '../components/QueryStatus.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import ClarificationPrompt from '../components/ClarificationPrompt.jsx';
import DatabaseSchemaModal from '../components/DatabaseSchemaModal.jsx';

import { Database, History, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  // Navigation & modals
  const [activeTab, setActiveTab] = useState('new-query');
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [schemaTables, setSchemaTables] = useState([]);

  // Database status
  const [dbHealth, setDbHealth] = useState({
    connected: true,
    database: 'My College DB',
    engine: 'PostgreSQL',
    isMock: true,
  });

  // Query workflow state
  const [question, setQuestion] = useState('Which CSE students got placed above 15 LPA?');
  const [status, setStatus] = useState('completed'); // Default with initial showcase query matching mockup!
  const [loadingPhase, setLoadingPhase] = useState(''); // 'generating' | 'executing'
  const [generatedSql, setGeneratedSql] = useState(
    `SELECT s.name, c.name, p.package\nFROM students s\nJOIN placements p ON s.id = p.student_id\nJOIN companies c ON c.id = p.company_id\nWHERE s.department = 'CSE'\n  AND p.package > 15;`
  );
  const [understanding, setUnderstanding] = useState({
    tables: ['students', 'placements', 'companies'],
    filters: ['department = CSE', 'package > 15 LPA'],
    ambiguityCheck: 'Clear - no question needed',
    safetyCheck: 'SELECT only - passed',
    retrievedContext: [
      'Table: students (id, name, department, cgpa)',
      'Table: placements (student_id, company_id, package in LPA)',
      'Table: companies (id, name, tier)',
      'Relationship: students.id = placements.student_id',
      'Relationship: companies.id = placements.company_id',
    ],
  });
  const [explanation, setExplanation] = useState(
    'Showing CSE students with package above 15 LPA.'
  );
  const [columns, setColumns] = useState(['Student', 'Company', 'Package']);
  const [rows, setRows] = useState([
    { Student: 'Rahul', Company: 'Google', Package: '20 LPA' },
    { Student: 'Aman', Company: 'Microsoft', Package: '18 LPA' },
  ]);
  const [rowCount, setRowCount] = useState(2);
  const [executionTimeMs, setExecutionTimeMs] = useState(15.2);
  const [summaryText, setSummaryText] = useState(
    '2 students found. Showing CSE students with package above 15 LPA.'
  );

  // Error & clarification states
  const [error, setError] = useState(null);
  const [clarificationData, setClarificationData] = useState(null);

  // Query History
  const [history, setHistory] = useState([
    {
      id: 'initial-1',
      question: 'Which CSE students got placed above 15 LPA?',
      sql: `SELECT s.name, c.name, p.package FROM students s JOIN placements p ON s.id = p.student_id JOIN companies c ON c.id = p.company_id WHERE s.department = 'CSE' AND p.package > 15;`,
      rowCount: 2,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  // Load database metadata on startup
  useEffect(() => {
    async function loadDbInfo() {
      try {
        const health = await fetchDatabaseHealth();
        setDbHealth(health);

        const schema = await fetchDatabaseSchema();
        setSchemaTables(schema.tables || []);
      } catch (err) {
        console.error('Failed to load DB info:', err);
      }
    }
    loadDbInfo();
  }, []);

  /**
   * Step 4 Workflow - Step 1: User enters question -> generate SQL
   */
  const handleGenerateSql = async (inputQuestion) => {
    const q = inputQuestion || question;
    if (!q.trim()) return;

    setError(null);
    setClarificationData(null);
    setStatus('generating');
    setLoadingPhase('generating');

    try {
      // 1. Check clarification first
      const clarifyRes = await clarifyQuestion(q);
      if (clarifyRes.needsClarification) {
        setStatus('clarification');
        setClarificationData({
          question: clarifyRes.clarificationQuestion,
          options: clarifyRes.options,
        });
        setLoadingPhase('');
        return;
      }

      // 2. Call AI generate endpoint
      const genRes = await generateSqlApi(q);

      setGeneratedSql(genRes.sql);
      setUnderstanding(genRes.understanding);
      setExplanation(genRes.explanation || '');
      setStatus('generated');
      setLoadingPhase('');
      setSummaryText('SQL query generated successfully. Ready to run against database.');
    } catch (err) {
      console.error('SQL generation failed:', err);
      setStatus('error');
      setLoadingPhase('');
      setError({
        code: err.code || 'SQL_GENERATION_FAILED',
        message: err.message || 'Failed to generate SQL query for the entered question.',
      });
    }
  };

  /**
   * Step 4 Workflow - Step 2: User runs the generated SQL against PostgreSQL
   */
  const handleExecuteQuery = async () => {
    if (!generatedSql) return;

    setError(null);
    setStatus('executing');
    setLoadingPhase('executing');

    try {
      const execRes = await executeQueryApi(question, generatedSql);

      setColumns(execRes.columns || []);
      setRows(execRes.rows || []);
      setRowCount(execRes.rowCount ?? (execRes.rows ? execRes.rows.length : 0));
      setExecutionTimeMs(execRes.executionTimeMs || 15);
      setStatus('completed');
      setLoadingPhase('');

      const count = execRes.rowCount ?? execRes.rows.length;
      const countMsg = `${count} ${count === 1 ? 'student' : 'students'} found. ${
        execRes.explanation || explanation || 'Showing query results.'
      }`;
      setSummaryText(countMsg);

      // Add to query history
      setHistory((prev) => [
        {
          id: String(Date.now()),
          question,
          sql: generatedSql,
          rowCount: count,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    } catch (err) {
      console.error('Query execution failed:', err);
      setStatus('error');
      setLoadingPhase('');
      setError({
        code: err.code || 'QUERY_EXECUTION_FAILED',
        message: err.message || 'Query execution against database failed.',
      });
    }
  };

  /**
   * Clear dashboard state
   */
  const handleClear = () => {
    setQuestion('');
    setStatus('idle');
    setGeneratedSql('');
    setUnderstanding(null);
    setExplanation('');
    setColumns([]);
    setRows([]);
    setRowCount(0);
    setError(null);
    setClarificationData(null);
    setSummaryText('');
  };

  /**
   * Clarification option selected
   */
  const handleClarificationOption = (optionText) => {
    const resolvedQuestion = `${question} (${optionText})`;
    setQuestion(resolvedQuestion);
    setClarificationData(null);
    handleGenerateSql(resolvedQuestion);
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSchema={() => setIsSchemaModalOpen(true)}
        historyCount={history.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="px-6 py-4 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'history' ? 'Query History' : 'New Query'}
            </h2>
            <p className="text-xs text-slate-500 hidden sm:block">
              Ask natural language questions to query PostgreSQL safely using AI.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Database Status Pill (from mockup) */}
            <button
              type="button"
              onClick={() => setIsSchemaModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-xs font-semibold hover:bg-emerald-100/70 transition-colors cursor-pointer shadow-2xs"
              title="Click to view schema"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{dbHealth.database} | {dbHealth.engine}</span>
            </button>
          </div>
        </header>

        {/* Body View Container */}
        <main className="p-6 max-w-6xl w-full mx-auto space-y-5">
          {activeTab === 'history' ? (
            /* Query History Tab View */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  Past Executed Queries ({history.length})
                </h3>
                <button
                  onClick={() => setActiveTab('new-query')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  ← Back to New Query
                </button>
              </div>

              {history.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No queries run yet.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                      onClick={() => {
                        setQuestion(item.question);
                        setActiveTab('new-query');
                        handleGenerateSql(item.question);
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 mb-1">{item.question}</p>
                        <code className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block truncate max-w-xl">
                          {item.sql}
                        </code>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                        <span>{item.rowCount} rows</span>
                        <span className="text-slate-300">•</span>
                        <span>{item.timestamp}</span>
                        <span className="text-blue-600 font-semibold text-xs ml-2">Reload →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* New Query Main View */
            <>
              {/* 1. Ask your database card */}
              <QueryInput
                question={question}
                setQuestion={setQuestion}
                onGenerate={handleGenerateSql}
                onClear={handleClear}
                isLoading={status === 'generating' || status === 'executing'}
                loadingPhase={loadingPhase}
              />

              {/* 2. Error message if any */}
              {error && (
                <ErrorMessage
                  error={error}
                  onRetry={() => {
                    setError(null);
                    if (generatedSql) {
                      handleExecuteQuery();
                    } else {
                      handleGenerateSql();
                    }
                  }}
                  onDismiss={() => setError(null)}
                />
              )}

              {/* 3. Clarification prompt if ambiguous */}
              {status === 'clarification' && clarificationData && (
                <ClarificationPrompt
                  question={clarificationData.question}
                  options={clarificationData.options}
                  onSelectOption={handleClarificationOption}
                  onCancel={() => {
                    setStatus('idle');
                    setClarificationData(null);
                  }}
                />
              )}

              {/* 4. Status pill banner (e.g. ● 2 students found. Showing CSE students...) */}
              {status !== 'idle' && (
                <QueryStatus
                  status={status}
                  statusMessage={summaryText}
                  rowCount={rowCount}
                  executionTimeMs={executionTimeMs}
                  summaryText={summaryText}
                />
              )}

              {/* 5. Two-column layout: Left = Generated SQL, Right = How we understood */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SqlPreview
                  sql={generatedSql}
                  onExecute={handleExecuteQuery}
                  isExecuting={status === 'executing'}
                  isExecuted={status === 'completed'}
                  executionTimeMs={executionTimeMs}
                />

                <QueryUnderstanding
                  understanding={understanding}
                  explanation={explanation}
                />
              </div>

              {/* 6. Results Table Card */}
              <QueryResults
                columns={columns}
                rows={rows}
                rowCount={rowCount}
                executionTimeMs={executionTimeMs}
                retrievedContext={understanding?.retrievedContext || []}
                isExecuted={status === 'completed'}
              />
            </>
          )}
        </main>
      </div>

      {/* Database Schema Reference Modal */}
      <DatabaseSchemaModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        tables={schemaTables}
      />
    </div>
  );
}
