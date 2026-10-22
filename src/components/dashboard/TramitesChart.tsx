import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as RechartsBarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function TramitesChart({ data = [] }: { data?: any[] }) {
  const chartData = data && data.length > 0 ? data.map(d => ({ name: d.name, value: d.aprobados })) : [
    { name: "SEM 1", value: 0 }
  ];
  const maxSemName = chartData.reduce((prev, current) => (prev.value > current.value) ? prev : current).name;

  return (
    <Card className="rounded-xl border-none shadow-sm flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-bold text-slate-800">Trámites Realizados</CardTitle>
          <p className="text-sm font-semibold text-slate-400 mt-1">Resumen del último mes de gestión</p>
        </div>
        <div className="bg-slate-100 text-slate-700 font-bold text-xs px-3 py-1 rounded-md">
          Mensual
        </div>
      </CardHeader>
      <CardContent className="flex-1 mt-4">
        <div style={{ height: 288, width: '100%' }}>
          <ResponsiveContainer width="100%" height={288}>
            <RechartsBarChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                dy={10}
              />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === maxSemName ? '#0A2342' : '#CBD5E1'} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
