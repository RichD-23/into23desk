'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,  } from 'recharts';
import { deflectionByTopicData } from './analyticsData';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = (payload[0]?.value || 0) + (payload[1]?.value || 0);
  const deflectedPct = total > 0 ? Math.round((payload[0]?.value / total) * 100) : 0;
  return (
    <div className="bg-card border border-border rounded-lg shadow-modal px-3 py-2.5 text-[12px]">
      <p className="font-600 text-foreground mb-1.5">{label}</p>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
        <span className="text-muted-foreground">AI Deflected:</span>
        <span className="font-600 text-foreground tabular-nums">{payload[0]?.value}</span>
      </div>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="w-2 h-2 rounded-full bg-danger flex-shrink-0" />
        <span className="text-muted-foreground">Escalated:</span>
        <span className="font-600 text-foreground tabular-nums">{payload[1]?.value}</span>
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-border">
        <span className="text-muted-foreground">Deflection rate: </span>
        <span className="font-700 text-accent">{deflectedPct}%</span>
      </div>
    </div>
  );
}

export default function DeflectionTopicsChart() {
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={deflectionByTopicData}
          layout="vertical"
          margin={{ top: 0, right: 4, left: 60, bottom: 0 }}
          barSize={10}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="topic"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="deflected" name="AI Deflected" fill="var(--accent)" radius={[0, 3, 3, 0]} stackId="a" />
          <Bar dataKey="escalated" name="Escalated" fill="var(--danger)" radius={[0, 3, 3, 0]} stackId="a" opacity={0.6} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}