import { Download } from 'lucide-react';
import { Finding } from '../lib/gemini';
import { exportToExcel } from '../lib/export';

interface DataTableProps {
  findings: Finding[];
}

export function DataTable({ findings }: DataTableProps) {
  if (findings.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm">
        <p className="text-slate-500">No findings extracted yet.</p>
      </div>
    );
  }

  const displayFindings = findings.slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div>
          <h3 className="font-semibold text-slate-800">Extracted Findings</h3>
          {findings.length > 10 && (
            <p className="text-xs text-slate-500 mt-1">Menampilkan 10 data teratas dari total {findings.length} temuan</p>
          )}
        </div>
        <button
          onClick={() => exportToExcel(findings)}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Export to Excel</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-medium">No.</th>
              <th className="px-6 py-3 font-medium">Problem</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Area</th>
              <th className="px-6 py-3 font-medium">PIC</th>
              <th className="px-6 py-3 font-medium">Root Cause</th>
              <th className="px-6 py-3 font-medium">Action</th>
              <th className="px-6 py-3 font-medium">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {displayFindings.map((finding, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-medium">{finding.no}</td>
                <td className="px-6 py-4 text-slate-700 min-w-[200px]">{finding.problem}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                    {finding.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-700">{finding.area}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-700">{finding.pic}</td>
                <td className="px-6 py-4 text-slate-700 min-w-[200px]">{finding.rootCause}</td>
                <td className="px-6 py-4 text-slate-700 min-w-[200px]">{finding.action}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-700">{finding.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
