'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { frtTrendData } from './analyticsData';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const frt = payload[0]?.value;
  const overSla = frt > 5;
  return (
    <div className="bg-card border border-border rounded-lg shadow-modal px-3 py-2.5 text-[12px]">
      <p className="font-600 text-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${overSla ? 'bg-danger' : 'bg-success'}`} />
        <span className="text-muted-foreground">Avg FRT:</span>
        <span className={`font-700 tabular-nums ${overSla ? 'text-danger' : 'text-success'}`}>
          {frt} min
        </span>
      </div>
      {overSla && (
        <p className="text-[10px] text-danger mt-1">⚠ Above 5-min SLA target</p>
      )}
    </div>
  );
}

export default function FRTTrendChart() {
  return (
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={frtTrendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            unit=" min"
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={5}
            stroke="var(--warning)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'SLA 5m', position: 'right', fontSize: 9, fill: 'var(--warning)' }}
          />
          <Line
            type="monotone"
            dataKey="frt"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--primary)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}