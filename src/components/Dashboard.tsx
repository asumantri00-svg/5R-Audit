import { DashboardData } from '../lib/gemini';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Markdown from 'react-markdown';
import { Lightbulb, FileText, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardProps {
  data: DashboardData | null;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6'];

export function Dashboard({ data }: DashboardProps) {
  const displayData = data || {
    summary: "Belum ada data. Silakan upload dokumen audit untuk menghasilkan ringkasan AI.",
    suggestions: "Belum ada data. Silakan upload dokumen audit untuk mendapatkan saran perbaikan.",
    chartData: {
      categoryDistribution: [{ name: 'Kosong', value: 1 }],
      areaDistribution: [{ name: 'Kosong', value: 1 }],
      picDistribution: [{ name: 'Kosong', value: 1 }],
    }
  };

  return (
    <div className={cn("space-y-6 transition-all duration-500", !data && "opacity-40 grayscale pointer-events-none blur-[1px]")}>
      
      {/* Charts - Top */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Data Distribution</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Category Chart */}
          <div className="h-64">
            <h4 className="text-sm font-medium text-slate-500 text-center mb-4">By Category</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayData.chartData.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {displayData.chartData.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Area Chart */}
          <div className="h-64">
            <h4 className="text-sm font-medium text-slate-500 text-center mb-4">By Area</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayData.chartData.areaDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* PIC Chart */}
          <div className="h-64">
            <h4 className="text-sm font-medium text-slate-500 text-center mb-4">By PIC</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayData.chartData.picDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={80} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary and Insights - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Summary Audit 5R 1S</h3>
          </div>
          <div className="prose prose-sm prose-slate max-w-none">
            <Markdown>{displayData.summary}</Markdown>
          </div>
        </div>

        {/* Insights Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <Lightbulb className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Insights</h3>
          </div>
          <div className="prose prose-sm prose-slate max-w-none">
            <Markdown>{displayData.suggestions}</Markdown>
          </div>
        </div>
      </div>
      
    </div>
  );
}
