
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const data = [
  { year: "2024", value: 69200 },
  { year: "2029", value: 128000 },
  { year: "2034", value: 206000 },
  { year: "2039", value: 304000 },
  { year: "2044", value: 428000 },
  { year: "2049", value: 584000 },
];

const formatNumber = (value: number) => {
    return new Intl.NumberFormat('de-CH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

export default function GoalProjection() {
  return (
    <Card className="bg-background shadow-sm border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Goal Projection</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          Estimated time to reach a financial goal.
        </p>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                    <linearGradient id="geminiBarGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => formatNumber(value as number)}
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
                contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                }}
                formatter={(value: number) => [formatNumber(value), 'Value']}
              />
              <Bar dataKey="value" fill="url(#geminiBarGradient)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
