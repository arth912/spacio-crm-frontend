"use client";

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200/80 rounded-xl shadow-xl text-xs font-semibold">
        <p className="text-slate-500 mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600">{entry.name}:</span>
            <span className="text-slate-900 font-extrabold">₹{entry.value.toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200/80 rounded-xl shadow-xl text-xs font-semibold">
        <p className="text-slate-900 font-bold mb-1">{data.name}</p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
          <span className="text-slate-500">Budget:</span>
          <span className="text-slate-900 font-extrabold">₹{data.budget.toLocaleString('en-IN')}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200/80 rounded-xl shadow-xl text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
          <span className="text-slate-500">{data.name}:</span>
          <span className="text-slate-900 font-extrabold">{data.value} {data.value === 1 ? 'project' : 'projects'}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function MonthlyAreaChart({ monthlyData }: { monthlyData: any[] }) {
  return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis 
              stroke="#94A3B8" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val.toLocaleString('en-IN')}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="total" name="Total Estimate" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
            <Area type="monotone" dataKey="approved" name="Approved Revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorApproved)" />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 15 }} />
          </AreaChart>
        </ResponsiveContainer>
  );
}

export function StatusPieChart({ statusData, statusColors }: { statusData: any[]; statusColors: Record<string, string> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={statusData}
          innerRadius={60}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {statusData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={statusColors[entry.name] || '#94A3B8'} />
          ))}
        </Pie>
        <Tooltip content={<CustomPieTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BudgetBarChart({ budgetData }: { budgetData: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={budgetData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
        <XAxis 
          type="number" 
          stroke="#94A3B8" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val.toLocaleString('en-IN')}`}
        />
        <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={10} width={80} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomBarTooltip />} />
        <Bar dataKey="budget" fill="#8B5CF6" radius={[0, 8, 8, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
