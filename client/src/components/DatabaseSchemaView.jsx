import React, { useState } from 'react';
import { CheckSquare, Square, Table2, Key, Info, Network } from 'lucide-react';

export default function DatabaseSchemaView({
  allowedTables = ['students', 'companies', 'placements', 'courses'],
  onToggleTableAllowed,
}) {
  const [selectedTableName, setSelectedTableName] = useState('students');

  const schemaData = {
    students: {
      columns: [
        { name: 'id', type: 'integer', key: 'PK', meaning: 'Unique student id' },
        { name: 'name', type: 'text', key: '', meaning: 'Student full name' },
        { name: 'department', type: 'text', key: '', meaning: 'Branch (CSE, IT...)' },
        { name: 'cgpa', type: 'numeric', key: '', meaning: 'Cumulative GPA out of 10' },
        { name: 'city', type: 'text', key: '', meaning: 'Home city' },
        { name: 'skills', type: 'text', key: '', meaning: 'Technical skills' },
      ],
      relationships: [
        'placements.student_id -> students.id',
        'attendance.student_id -> students.id',
      ],
    },
    companies: {
      columns: [
        { name: 'id', type: 'integer', key: 'PK', meaning: 'Unique company id' },
        { name: 'name', type: 'text', key: '', meaning: 'Company corporate name' },
        { name: 'sector', type: 'text', key: '', meaning: 'Industry sector (Tech, Finance...)' },
        { name: 'city', type: 'text', key: '', meaning: 'Corporate headquarters city' },
      ],
      relationships: [
        'placements.company_id -> companies.id',
      ],
    },
    placements: {
      columns: [
        { name: 'id', type: 'integer', key: 'PK', meaning: 'Placement offer identifier' },
        { name: 'student_id', type: 'integer', key: 'FK', meaning: 'Placed student reference' },
        { name: 'company_id', type: 'integer', key: 'FK', meaning: 'Hiring company reference' },
        { name: 'package', type: 'numeric', key: '', meaning: 'Annual salary package in LPA' },
        { name: 'placement_date', type: 'date', key: '', meaning: 'Date placement offer was issued' },
      ],
      relationships: [
        'placements.student_id -> students.id',
        'placements.company_id -> companies.id',
      ],
    },
    courses: {
      columns: [
        { name: 'id', type: 'integer', key: 'PK', meaning: 'Course internal ID' },
        { name: 'name', type: 'text', key: '', meaning: 'Course subject title' },
        { name: 'department', type: 'text', key: '', meaning: 'Offering academic department' },
        { name: 'credits', type: 'integer', key: '', meaning: 'Academic credits assigned' },
      ],
      relationships: [
        'attendance.course_id -> courses.id',
      ],
    },
    attendance: {
      columns: [
        { name: 'id', type: 'integer', key: 'PK', meaning: 'Attendance record ID' },
        { name: 'student_id', type: 'integer', key: 'FK', meaning: 'Student reference' },
        { name: 'percentage', type: 'numeric', key: '', meaning: 'Semester attendance %' },
        { name: 'term', type: 'text', key: '', meaning: 'Semester / Academic Year' },
      ],
      relationships: [
        'attendance.student_id -> students.id',
      ],
    },
  };

  const allTables = ['students', 'companies', 'placements', 'courses', 'attendance'];
  const activeTableData = schemaData[selectedTableName] || schemaData.students;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
      {/* Left Column: Tables (allowed to query) matching Page 4 */}
      <div className="md:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Tables (allowed to query)
          </h3>

          <div className="space-y-1.5">
            {allTables.map((tableName) => {
              const isAllowed = allowedTables.includes(tableName);
              const isSelected = selectedTableName === tableName;

              return (
                <div
                  key={tableName}
                  onClick={() => setSelectedTableName(tableName)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 border border-blue-200/80 shadow-2xs'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Checkbox toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTableAllowed(tableName);
                      }}
                      className="cursor-pointer"
                      title={isAllowed ? 'Hide table from AI' : 'Allow table for AI'}
                    >
                      {isAllowed ? (
                        <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center">
                          <CheckSquare className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-slate-300 bg-white"></div>
                      )}
                    </button>
                    <span className="font-mono">{tableName}</span>
                  </div>

                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
          <p>Untick a table to hide it from the AI completely.</p>
        </div>
      </div>

      {/* Right Column: Columns & Relationships table matching Page 4 */}
      <div className="md:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between">
        <div>
          {/* Table Header */}
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 font-mono">
              {selectedTableName} - columns
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              {activeTableData.columns.length} columns
            </span>
          </div>

          {/* Columns Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0c162d] text-white uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                  <th className="py-2.5 px-4 font-semibold">Column</th>
                  <th className="py-2.5 px-4 font-semibold">Type</th>
                  <th className="py-2.5 px-4 font-semibold">Key</th>
                  <th className="py-2.5 px-4 font-semibold">Meaning (used by RAG)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {activeTableData.columns.map((col, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 odd:bg-white even:bg-slate-50/30">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                      {col.name}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {col.type}
                    </td>
                    <td className="py-2.5 px-4">
                      {col.key === 'PK' ? (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          PK
                        </span>
                      ) : col.key === 'FK' ? (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          FK
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-medium">
                      {col.meaning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Relationships section */}
          {activeTableData.relationships && (
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/40">
              <h4 className="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-blue-600" />
                Relationships
              </h4>
              <div className="space-y-1 font-mono text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                {activeTableData.relationships.map((rel, rIdx) => (
                  <div key={rIdx}>{rel}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="p-3 px-6 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500">
          The 'Meaning' column represents business knowledge that feeds the RAG index.
        </div>
      </div>
    </div>
  );
}
