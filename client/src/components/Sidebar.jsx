import React from 'react';
import {
  MessageSquarePlus,
  History,
  BookmarkCheck,
  Database,
  Link2,
  Settings,
  Sparkles,
} from 'lucide-react';

export default function Sidebar({
  activeTab = 'new-query',
  setActiveTab,
  onOpenSchema,
  historyCount = 0,
}) {
  const navItems = [
    { id: 'new-query', label: 'New Query', icon: MessageSquarePlus, isPrimary: true },
    { id: 'history', label: 'Query History', icon: History, badge: historyCount > 0 ? historyCount : null },
    { id: 'saved', label: 'Saved Queries', icon: BookmarkCheck },
    { id: 'schema', label: 'Database Schema', icon: Database, action: onOpenSchema },
    { id: 'connections', label: 'Connections', icon: Link2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0a1124] text-slate-300 flex flex-col justify-between shrink-0 min-h-screen border-r border-slate-800/80 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-800/60">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-lg shadow-md shadow-blue-500/20">
            Q
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              QueryGuard AI
            </h1>
            <span className="text-[10px] text-blue-400 font-mono tracking-wider uppercase block">
              QueryDB Engine
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full transition-all ${
                      isActive ? 'bg-white shadow-xs' : 'bg-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* College Project Footer */}
      <div className="p-4 border-t border-slate-800/60">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>College Project - v1.0</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Operational"></span>
        </div>
      </div>
    </aside>
  );
}
