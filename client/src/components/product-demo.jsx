import { useState } from 'react';

const examples = [
  {
    label: 'Top customers',
    question: 'Who are our top 5 customers by total spend?',
    sql: <>SELECT <span className="sql-keyword">customers</span>.name, <span className="sql-keyword">SUM</span>(orders.total)<br />FROM customers<br />JOIN orders <span className="sql-keyword">USING</span> (customer_id)<br /><span className="sql-keyword">GROUP BY</span> 1 <span className="sql-keyword">ORDER BY</span> 2 <span className="sql-keyword">DESC</span><br /><span className="sql-keyword">LIMIT</span> 5;</>,
    columns: ['customer', 'total_spend'],
    rows: [['Olive & Co.', '$18,420'], ['Northstar Studio', '$14,860'], ['Goodkind Market', '$12,105']],
    count: '5 rows',
  },
  {
    label: 'Monthly revenue',
    question: 'How much revenue did we make each month?',
    sql: <><span className="sql-keyword">SELECT</span> DATE_TRUNC(<span className="sql-string">'month'</span>, created_at)<br /><span className="sql-keyword">AS</span> month, <span className="sql-keyword">SUM</span>(total) <span className="sql-keyword">AS</span> revenue<br /><span className="sql-keyword">FROM</span> orders<br /><span className="sql-keyword">GROUP BY</span> 1 <span className="sql-keyword">ORDER BY</span> 1 <span className="sql-keyword">DESC</span>;</>,
    columns: ['month', 'revenue'],
    rows: [['Oct 2024', '$42,810'], ['Sep 2024', '$38,240'], ['Aug 2024', '$35,690']],
    count: '12 rows',
  },
  {
    label: 'Recent orders',
    question: 'Show me the 3 most recent orders.',
    sql: <><span className="sql-keyword">SELECT</span> order_id, customer_id,<br />total, created_at<br /><span className="sql-keyword">FROM</span> orders<br /><span className="sql-keyword">ORDER BY</span> created_at <span className="sql-keyword">DESC</span><br /><span className="sql-keyword">LIMIT</span> 3;</>,
    columns: ['order_id', 'total'],
    rows: [['ORD-2891', '$248.00'], ['ORD-2890', '$76.50'], ['ORD-2889', '$516.00']],
    count: '3 rows',
  },
];

export default function ProductDemo() {
  const [activeExample, setActiveExample] = useState(0);
  const example = examples[activeExample];

  return (
    <div className="query-window">
      <div className="window-topbar">
        <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
        <span className="window-title">querydb <span>/</span> workspace</span>
        <span className="connection-status"><i /> Connected</span>
      </div>
      <div className="workspace-bar">
        <span className="workspace-name"><span className="database-glyph" aria-hidden="true">▦</span> shop_db <span className="chevron">⌄</span></span>
        <span className="schema-label"><i /> schema loaded</span>
      </div>
      <div className="query-area">
        <div className="query-label"><span className="query-icon" aria-hidden="true">✳</span><span>ASK YOUR DATA</span><span className="label-divider" /><span className="natural-label">plain English</span></div>
        <p className="question-text">{example.question}<span className="text-cursor" aria-hidden="true" /></p>
        <div className="sample-questions" aria-label="Try a sample question">
          {examples.map((item, index) => (
            <button className={activeExample === index ? 'sample-chip is-active' : 'sample-chip'} type="button" key={item.label} onClick={() => setActiveExample(index)} aria-pressed={activeExample === index}>{item.label}</button>
          ))}
        </div>
        <div className="run-row"><span className="shortcut-hint">↵ <span>Press to ask</span></span><button className="run-button" type="button" onClick={() => setActiveExample((current) => (current + 1) % examples.length)}>Run query <span aria-hidden="true">↗</span></button></div>
      </div>
      <div className="result-area">
        <div className="result-heading"><div><span className="result-dot" /> <strong>Query result</strong><span className="result-meta">{example.count}</span></div><button type="button" className="result-menu" aria-label="More result options">···</button></div>
        <div className="result-grid">
          <div className="sql-panel">
            <div className="panel-label"><span>GENERATED SQL</span><span className="sql-language">PostgreSQL</span></div>
            <pre><code>{example.sql}</code></pre>
          </div>
          <div className="table-panel">
            <div className="panel-label"><span>RESULTS</span><span className="table-count">{example.count}</span></div>
            <div className="data-table" role="table" aria-label={`${example.label} sample results`}>
              <div className="data-row data-header" role="row">{example.columns.map((column) => <span role="columnheader" key={column}>{column}</span>)}</div>
              {example.rows.map((row) => <div className="data-row" role="row" key={row[0]}>{row.map((value) => <span role="cell" key={value}>{value}</span>)}</div>)}
            </div>
          </div>
        </div>
        <div className="safety-note"><span aria-hidden="true">✓</span> Read-only query <span className="note-separator">·</span> SQL is validated before execution</div>
      </div>
      <div className="window-bottom"><span><i /> Ready for your next question</span><span>QUERYDB PREVIEW <span className="bottom-version">V0.1</span></span></div>
    </div>
  );
}
