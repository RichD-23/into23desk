'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { languageDistributionData } from './analyticsData';

const barColors = [
  'var(--primary)',
  'var(--accent)',
  '#059669',
  '#D97706',
  '#0891B2',
  '#7C3AED',
  '#BE185D',
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-modal px-3 py-2.5 text-[12px]">
      <p className="font-600 text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">
        Conversations: <span className="font-700 text-foreground tabular-nums">{payload[0]?.value}</span>
      </p>
      <p className="text-muted-foreground">
        Share: <span className="font-700 text-foreground">{payload[0]?.payload?.pct}%</span>
      </p>
    </div>
  );
}

export default function LanguageDistributionChart() {
  return (
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={languageDistributionData}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          barSize={20}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="language"
            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {languageDistributionData.map((entry, index) => (
              <Cell
                key={`lang-cell-${entry.language}`}
                fill={barColors[index % barColors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}