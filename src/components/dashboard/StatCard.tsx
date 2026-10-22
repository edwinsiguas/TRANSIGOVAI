import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendValue?: string;
  alert?: boolean;
}

export function StatCard({ title, value, icon: Icon, trend, trendValue, alert }: StatCardProps) {
  return (
    <Card className="rounded-xl border-none shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${alert ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-800'}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
              <h3 className={`text-3xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-slate-900'}`}>{value}</h3>
            </div>
          </div>
          {trend && (
            <div className="flex items-center text-sm font-medium pt-1">
              <span className={alert ? "text-red-500 font-bold" : "text-green-500 font-bold"}>
                {trend === 'up' ? '+' : '-'}{trendValue}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
