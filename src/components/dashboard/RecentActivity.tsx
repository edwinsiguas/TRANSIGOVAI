import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, FileBadge, AlertTriangle, Settings } from "lucide-react";

export function RecentActivity({ data = [] }: { data?: any[] }) {
  const activities = data && data.length > 0 ? data : [
    {
      id: 1,
      action: "Plataforma operativa y lista para registro",
      type: "system",
      time: "Ahora mismo",
      user: "Sistema"
    }
  ];

  const getIcon = (type: string) => {
    switch(type) {
        case 'driver': return UserCheck;
        case 'permit': return FileBadge;
        case 'company': return AlertTriangle;
        default: return Settings;
    }
  }

  const getColorClass = (type: string) => {
      switch(type) {
        case 'company': return "text-red-500 bg-red-50";
        default: return "text-slate-600 bg-slate-100";
      }
  }

  return (
    <Card className="rounded-xl border-none shadow-sm flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <CardTitle className="text-lg font-bold text-slate-800">Actividad Reciente</CardTitle>
        <button className="text-sm font-bold text-slate-900 hover:underline">Ver todo</button>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-6">
          {activities.map((activity) => {
            const Icon = getIcon(activity.type);
            const colorClass = getColorClass(activity.type);

            return (
              <div key={activity.id} className="flex gap-4 items-start">
                <div className={`p-3 rounded-full mt-1 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">{activity.action}</h4>
                  <p className="text-sm font-semibold text-slate-500">Por {activity.user}</p>
                  <p className="text-xs font-semibold text-slate-400">{activity.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
