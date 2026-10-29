import React, { useState, useEffect } from 'react';
import {
  fetchDatabaseHealth,
  fetchDatabaseSchema,
  generateSqlApi,
  executeQueryApi,
  clarifyQuestion,
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
import DatabaseSchemaView from '../components/DatabaseSchemaView.jsx';
import QueryHistoryView from '../components/QueryHistoryView.jsx';
import ConnectionsView from '../components/ConnectionsView.jsx';
import SettingsView from '../components/SettingsView.jsx';

export default function Dashboard() {
  // Navigation & tabs
  const [activeTab, setActiveTab] = useState('new-query'); // 'new-query' | 'history' | 'saved' | 'schema' | 'connections' | 'settings'
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [schemaTables, setSchemaTables] = useState([]);
  const [allowedTables, setAllowedTables] = useState([
    'students',
    'companies',
    'placements',
    'courses',
  ]);

  // Database status
  const [dbHealth, setDbHealth] = useState({
    connected: true,
    database: 'My College DB',
    engine: 'PostgreSQL',
    isMock: true,
  });

  // Query workflow state
  const [question, setQuestion] = useState('Which CSE students got placed above 15 LPA?');
  const [status, setStatus] = useState('completed'); // Default showcase query matching mockup
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

  // Error & Clarification states (Page 2)
  const [error, setError] = useState(null);
  const [clarificationData, setClarificationData] = useState(null);

  // Query History & Saved queries (Page 3)
  const [history, setHistory] = useState([
    {
      id: 'h-1',
      question: 'Which CSE students got placed above 15 LPA?',
      database: 'My College DB',
      rows: 2,
      status: 'Success',
      when: '10:42',
      sql: `SELECT s.name, c.name, p.package FROM students s JOIN placements p ON s.id = p.student_id JOIN companies c ON c.id = p.company_id WHERE s.department = 'CSE' AND p.package > 15;`,
    },
    {
      id: 'h-2',
      question: 'Show the best students',
      database: 'My College DB',
      rows: '-',
      status: 'Clarified',
      when: '10:38',
      sql: `SELECT * FROM students ORDER BY cgpa DESC;`,
    },
    {
      id: 'h-3',
      question: 'Average package by department',
      database: 'Sample DB',
      rows: 5,
      status: 'Success',
      when: 'Yesterday',
      sql: `SELECT department, AVG(package) FROM placements GROUP BY department;`,
    },
    {
      id: 'h-4',
      question: 'Delete all students',
      database: 'Sample DB',
      rows: '-',
      status: 'Blocked',
      when: 'Yesterday',
      sql: `DELETE FROM students;`,
    },
  ]);

  const [savedIds, setSavedIds] = useState(['h-1']);

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
   * Handle AI Generation
   */
  const handleGenerateSql = async (inputQuestion) => {
    const q = inputQuestion || question;
    if (!q.trim()) return;

    setError(null);
    setClarificationData(null);
    setStatus('generating');
    setLoadingPhase('generating');

    try {
      // 1. Clarification check
      const clarifyRes = await clarifyQuestion(q);
      if (clarifyRes.needsClarification) {
        setStatus('clarification');
        setClarificationData({
          question: q,
          clarificationQuestion:
            clarifyRes.clarificationQuestion || 'What do you mean by "best students"?',
          options: clarifyRes.options?.length > 0
            ? clarifyRes.options
            : ['Highest CGPA', 'Highest placement package', 'Best attendance'],
        });
        setLoadingPhase('');
        return;
      }

      // 2. AI Generate SQL
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

      // Record blocked in history if unsafe
      if (err.code === 'UNSAFE_QUERY') {
        setHistory((prev) => [
          {
            id: String(Date.now()),
            question: q,
            database: dbHealth.database,
            rows: '-',
            status: 'Blocked',
            when: 'Just now',
            sql: q,
          },
          ...prev,
        ]);
      }
    }
  };

  /**
   * Handle Query Execution against PostgreSQL
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
          database: dbHealth.database,
          rows: count,
          status: 'Success',
          when: 'Just now',
          sql: generatedSql,
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
   * Clarification option selected (Page 2 continue action)
   */
  const handleClarificationContinue = (selectedCriteria) => {
    const original = clarificationData?.question || question;
    const resolvedQuestion = `${original} (${selectedCriteria})`;
    setQuestion(resolvedQuestion);
    setClarificationData(null);

    // Record Clarified in history
    setHistory((prev) => [
      {
        id: String(Date.now()),
        question: original,
        database: dbHealth.database,
        rows: '-',
        status: 'Clarified',
        when: 'Just now',
        sql: `Clarified as: ${selectedCriteria}`,
      },
      ...prev,
    ]);

    handleGenerateSql(resolvedQuestion);
  };

  /**
   * Star toggle for Saved Queries
   */
  const handleToggleSave = (id) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  /**
   * Select a query from history to reload in New Query
   */
  const handleSelectHistoryQuery = (item) => {
    setQuestion(item.question);
    setActiveTab('new-query');
    handleGenerateSql(item.question);
  };

  /**
   * Toggle table allowed for AI in Database Schema view
   */
  const handleToggleTableAllowed = (tableName) => {
    setAllowedTables((prev) =>
      prev.includes(tableName)
        ? prev.filter((t) => t !== tableName)
        : [...prev, tableName]
    );
  };

  // Header Title Resolver
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'history':
        return 'Query History';
      case 'saved':
        return 'Saved Queries';
      case 'schema':
        return 'Database Schema';
      case 'connections':
        return 'Connections';
      case 'settings':
        return 'Settings';
      default:
        return 'New Query';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
      {/* Left Sidebar matching mockup */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSchema={() => setActiveTab('schema')}
        historyCount={history.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar matching all pages */}
        <header className="px-6 py-4 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {getHeaderTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Database Status Pill from mockup */}
            <button
              type="button"
              onClick={() => setActiveTab('schema')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ecfdf5] text-emerald-800 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
              title="Click to view schema"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{dbHealth.database} | {dbHealth.engine}</span>
            </button>
          </div>
        </header>

        {/* Dynamic View Body */}
        <main className="p-6 max-w-6xl w-full mx-auto space-y-5">
          {/* TAB 1: NEW QUERY (PAGE 1) */}
          {activeTab === 'new-query' && (
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

              {/* 3. Status pill banner (● 2 students found. Showing CSE students...) */}
              {status !== 'idle' && (
                <QueryStatus
                  status={status}
                  statusMessage={summaryText}
                  rowCount={rowCount}
                  executionTimeMs={executionTimeMs}
                  summaryText={summaryText}
                />
              )}

              {/* 4. Two-column layout: Left = Generated SQL, Right = How we understood */}
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

              {/* 5. Results Table Card */}
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

          {/* TAB 2 & 3: QUERY HISTORY & SAVED QUERIES (PAGE 3) */}
          {(activeTab === 'history' || activeTab === 'saved') && (
            <QueryHistoryView
              history={history}
              savedIds={savedIds}
              onToggleSave={handleToggleSave}
              onSelectQuery={handleSelectHistoryQuery}
              isSavedView={activeTab === 'saved'}
            />
          )}

          {/* TAB 4: DATABASE SCHEMA (PAGE 4) */}
          {activeTab === 'schema' && (
            <DatabaseSchemaView
              allowedTables={allowedTables}
              onToggleTableAllowed={handleToggleTableAllowed}
            />
          )}

          {/* TAB 5: CONNECTIONS (PAGE 5) */}
          {activeTab === 'connections' && (
            <ConnectionsView
              onSwitchDatabase={(name) => {
                setDbHealth((prev) => ({ ...prev, database: name }));
                setActiveTab('new-query');
              }}
            />
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <SettingsView
              onClearHistory={() => {
                setHistory([]);
                setSavedIds([]);
              }}
            />
          )}
        </main>
      </div>

      {/* PAGE 2: CLARIFICATION CARD (MODAL / OVERLAY) */}
      {status === 'clarification' && clarificationData && (
        <ClarificationPrompt
          question={clarificationData.question}
          clarificationQuestion={clarificationData.clarificationQuestion}
          options={clarificationData.options}
          onSelectOption={handleClarificationContinue}
          onCancel={() => {
            setStatus('idle');
            setClarificationData(null);
          }}
        />
      )}

      {/* Database Schema Reference Modal */}
      <DatabaseSchemaModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        tables={schemaTables}
      />
    </div>
  );
}
