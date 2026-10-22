import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const COLORS = ["#0A2342", "#CBD5E1"];

export function FlotaChart({ data = [] }: { data?: any[] }) {
  const chartData = data && data.length > 0 ? data : [
    { name: "Habilitados", value: 0 },
    { name: "Suspendidos", value: 0 },
  ];

  const total = chartData.reduce((sum, entry) => sum + entry.value, 0);
  const percentageOperativo = total > 0 ? Math.round((chartData[0].value / total) * 100) : 0;

  return (
    <Card className="rounded-xl border-none shadow-sm flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-slate-800">Estado de Flota</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="relative flex justify-center items-center" style={{ height: 256 }}>
          <ResponsiveContainer width="100%" height={256}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-4xl font-extrabold text-slate-900">{percentageOperativo}%</span>
            <span className="text-xs font-semibold text-slate-500 tracking-wider">OPERATIVO</span>
          </div>
        </div>

        <div className="space-y-3 mt-4 px-4 pb-2">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex justify-between items-center text-sm font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span>{item.name}</span>
              </div>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
