import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpcomingExpirations({ data = [] }: { data?: any[] }) {
  const expirations = data && data.length > 0 ? data : [
    {
      id: 1,
      severity: "información",
      date: "Sin vencimientos",
      type: "Todo en orden",
      entity: "El sistema no detecta vencimientos próximos.",
    }
  ];

  return (
    <Card className="rounded-xl border-none shadow-sm flex flex-col h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold text-slate-800">Próximos Vencimientos</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {expirations.map((exp) => (
            <div key={exp.id} className="p-4 rounded-xl relative group cursor-pointer transition-colors hover:bg-slate-50 bg-slate-100/50">
              {exp.severity === 'crítico' && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-xl"></div>
              )}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider ${exp.severity === 'crítico' ? 'text-red-500' : 'text-slate-800'}`}>
                    VENCE: {exp.date}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{exp.type}</h4>
                  <p className="text-xs font-semibold text-slate-500">{exp.entity}</p>
                </div>
                <div className="mt-1">
                  {exp.severity === 'crítico' ? (
                    <CalendarClock className="w-4 h-4 text-red-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-2">
          <Button className="w-full bg-[#0A2342] hover:bg-[#0A2342]/90 text-white font-bold py-6 rounded-xl shadow-lg">
            Gestionar Alertas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
