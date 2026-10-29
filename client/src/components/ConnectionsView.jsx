import React, { useState } from 'react';
import { CheckCircle2, Plus, ShieldCheck, Database, Server, Key, AlertCircle } from 'lucide-react';

export default function ConnectionsView({ onSwitchDatabase }) {
  const [activeStep, setActiveStep] = useState(2);
  const [activeDbId, setActiveDbId] = useState('sample-db');

  const [formData, setFormData] = useState({
    connectionName: 'My College DB',
    host: 'db.example.com',
    port: '5432',
    database: 'college_db',
    username: 'queryguard_readonly',
    password: '••••••••••••',
    sslMode: 'require',
  });

  const [testStatus, setTestStatus] = useState({
    success: true,
    message: 'Connection successful - 5 tables found',
    permissions: 'Permissions: SELECT only (safe)',
  });
  const [isTesting, setIsTesting] = useState(false);

  const databases = [
    {
      id: 'sample-db',
      name: 'Sample College DB',
      description: 'Demo data - PostgreSQL',
      status: 'ACTIVE',
      statusType: 'active',
    },
    {
      id: 'my-college-db',
      name: 'My College DB',
      description: 'db.example.com:5432',
      status: 'CONNECTED',
      statusType: 'connected',
    },
  ];

  const handleTestConnection = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      setTestStatus({
        success: true,
        message: 'Connection successful - 5 tables found',
        permissions: 'Permissions: SELECT only (safe)',
      });
    }, 600);
  };

  const handleSave = () => {
    onSwitchDatabase?.(formData.connectionName);
  };

  return (
    <div className="space-y-6">
      {/* 5-Step Wizard matching Page 5 */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto text-xs font-semibold">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
              1
            </span>
            <span className="text-slate-800 hidden sm:inline">Choose DB</span>
          </div>
          <div className="flex-1 h-0.5 bg-blue-600 mx-2"></div>

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
              2
            </span>
            <span className="text-blue-600 font-bold hidden sm:inline">Details</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 mx-2"></div>

          {/* Step 3 */}
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 border border-slate-300 flex items-center justify-center text-xs">
              3
            </span>
            <span className="text-slate-400 hidden sm:inline">Test</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 mx-2"></div>

          {/* Step 4 */}
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 border border-slate-300 flex items-center justify-center text-xs">
              4
            </span>
            <span className="text-slate-400 hidden sm:inline">Pick tables</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 mx-2"></div>

          {/* Step 5 */}
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 border border-slate-300 flex items-center justify-center text-xs">
              5
            </span>
            <span className="text-slate-400 hidden sm:inline">Start asking</span>
          </div>
        </div>
      </div>

      {/* 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Your databases matching Page 5 */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Your databases</h3>

          <div className="space-y-3">
            {databases.map((db) => {
              const isActive = activeDbId === db.id;
              return (
                <div
                  key={db.id}
                  onClick={() => setActiveDbId(db.id)}
                  className={`bg-white rounded-xl border p-4 shadow-xs transition-all cursor-pointer ${
                    isActive ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {db.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {db.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        // disconnect toggle
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>

                  <div className="mt-3">
                    {db.statusType === 'active' ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                        CONNECTED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add new connection button */}
            <button
              type="button"
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add new connection
            </button>
          </div>

          {/* Yellow Tip card matching Page 5 */}
          <div className="bg-[#fef9c3] border border-amber-300/80 rounded-xl p-4 text-xs shadow-2xs">
            <h5 className="font-bold text-amber-950 mb-1 flex items-center gap-1">
              Tip: use a READ-ONLY user
            </h5>
            <p className="text-amber-900 leading-relaxed text-[11px]">
              Never give us your superuser password. Create a user that can only SELECT. Passwords are encrypted and never shown again.
            </p>
          </div>
        </div>

        {/* Right Column: Connect a PostgreSQL database form */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Connect a PostgreSQL database
          </h3>

          <div className="space-y-3.5 text-xs">
            {/* Connection Name */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Connection name
              </label>
              <input
                type="text"
                value={formData.connectionName}
                onChange={(e) =>
                  setFormData({ ...formData, connectionName: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            {/* Host & Port */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-slate-600 font-semibold mb-1">Host</label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Port</label>
                <input
                  type="text"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>

            {/* Database & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Database</label>
                <input
                  type="text"
                  value={formData.database}
                  onChange={(e) =>
                    setFormData({ ...formData, database: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>

            {/* Password & SSL mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">SSL mode</label>
                <select
                  value={formData.sslMode}
                  onChange={(e) =>
                    setFormData({ ...formData, sslMode: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs cursor-pointer"
                >
                  <option value="require">require</option>
                  <option value="prefer">prefer</option>
                  <option value="disable">disable</option>
                </select>
              </div>
            </div>

            {/* Green Connection successful box matching Page 5 */}
            {testStatus && (
              <div className="bg-[#ecfdf5] border border-emerald-300 rounded-xl p-3.5 flex items-start gap-3 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-emerald-950">
                    {testStatus.message}
                  </h5>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    {testStatus.permissions}
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-5 py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50/50 border border-blue-400 rounded-lg transition-colors cursor-pointer"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Save & Select Tables
              </button>
            </div>

            {/* Subtext note */}
            <p className="text-[11px] text-slate-400 pt-1">
              Password is sent to our server only - never stored in the browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
