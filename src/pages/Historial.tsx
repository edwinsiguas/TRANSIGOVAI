import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, Bus, ShieldCheck, FileText, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { apiClient } from '@/lib/api-client'
import { downloadJavaExcelReport } from '@/lib/java-report-client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { toast } from 'sonner'

export function HistorialPage() {
  const [dateRange, setDateRange] = useState<'30d' | 'trimestral' | 'anual'>('30d')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const [analytics, setAnalytics] = useState({
    kpis: { flota_autorizada: 0, cumplimiento_soat: 0, tramites_proceso: 0, empresas_activas: 0 },
    documentation: {
      soat: { valid: 0, total: 0 },
      rt: { valid: 0, total: 0 },
      licencias: { valid: 0, total: 0 }
    },
    growthData: [] as any[],
    serviceData: [] as any[],
    rankingData: [] as any[]
  })

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true)
        const res = await apiClient.getAnalyticsHistory()
        if (res.success) {
          setAnalytics(res.data)
        }
      } catch (error) {
        toast.error("Error cargando análisis históricos")
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [])

  if (loading) {
     return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-[#0A2342] mx-auto mb-4" />
          <p className="text-slate-500 font-semibold">Cargando reportes históricos...</p>
        </div>
      </div>
    )
  }

  const { kpis, documentation, growthData, serviceData, rankingData } = analytics;

  async function exportWithJava() {
    const records: Array<Record<string, string | number | boolean | null>> = [
      { Sección: 'Indicadores', Indicador: 'Flota autorizada', Valor: kpis.flota_autorizada },
      { Sección: 'Indicadores', Indicador: 'Cumplimiento SOAT (%)', Valor: kpis.cumplimiento_soat },
      { Sección: 'Indicadores', Indicador: 'Trámites este mes', Valor: kpis.tramites_proceso },
      { Sección: 'Indicadores', Indicador: 'Empresas operando', Valor: kpis.empresas_activas },
      ...([
        ['SOAT / CAT', documentation.soat],
        ['Revisión técnica', documentation.rt],
        ['Licencias operativas', documentation.licencias],
      ] as const).map(([categoria, estado]) => ({
        Sección: 'Estado de documentación',
        Indicador: categoria,
        Vigentes: estado.valid,
        Total: estado.total,
        'Cumplimiento (%)': estado.total ? Math.round((estado.valid / estado.total) * 100) : 0,
      })),
      ...growthData.map((item) => ({
        Sección: 'Crecimiento de flota',
        Mes: item.name ?? '',
        Vehículos: Number(item.vehiculos ?? 0),
        Mototaxis: Number(item.mototaxis ?? 0),
      })),
      ...serviceData.map((item) => ({
        Sección: 'Tipo de servicio',
        Categoría: item.name ?? '',
        Unidades: Number(item.value ?? 0),
        'Participación (%)': kpis.flota_autorizada
          ? Math.round((Number(item.value ?? 0) / kpis.flota_autorizada) * 100)
          : 0,
      })),
      ...rankingData.map((empresa) => ({
        Sección: 'Ranking de empresas',
        Empresa: empresa.name ?? '',
        RUC: empresa.ruc ?? '',
        'Unidades de flota': Number(empresa.flota ?? 0),
        Categoría: empresa.categoria ?? '',
        'Cumplimiento (%)': Number(empresa.cumplimiento ?? 0),
        Advertencia: Boolean(empresa.isWarning),
      })),
    ]

    setExporting(true)
    const toastId = toast.loading('Generando reporte con Java...')

    try {
      await downloadJavaExcelReport(
        'Reportes y estadísticas MTC Marcona',
        records,
        'Reporte_Estadisticas_Java',
      )
      toast.success('Reporte Excel generado con Java y descargado correctamente.', { id: toastId })
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No se pudo generar el reporte .'
      toast.error(message, { id: toastId })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">

      {}
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-4">
        <div>
          <p className="text-[10px] font-extrabold text-[#0A2342]/50 tracking-widest uppercase mb-1">Panel Central / Reportes y Estadísticas</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0A2342]">Reportes y Estadísticas</h1>
          <p className="text-slate-500 font-medium mt-1">Análisis operativo de la movilidad urbana en el distrito.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mt-2 xl:mt-0">
           <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200/50">
             <Button variant="ghost" onClick={() => setDateRange('30d')} className={`h-9 px-4 rounded-lg text-xs font-bold transition-all ${dateRange === '30d' ? 'bg-slate-100/80 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>últimos 30 días</Button>
             <Button variant="ghost" onClick={() => setDateRange('trimestral')} className={`h-9 px-4 rounded-lg text-xs font-bold transition-all ${dateRange === 'trimestral' ? 'bg-slate-100/80 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Trimestral</Button>
             <Button variant="ghost" onClick={() => setDateRange('anual')} className={`h-9 px-4 rounded-lg text-xs font-bold transition-all ${dateRange === 'anual' ? 'bg-slate-100/80 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Anual</Button>
           </div>

           <Button
             onClick={exportWithJava}
             disabled={exporting}
             className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white font-semibold shadow-md h-11 px-6 rounded-xl"
           >
             {exporting
               ? <Loader2 className="w-4 h-4 animate-spin" />
               : <Download className="w-4 h-4" />}
             {exporting ? 'Generando reporte...' : 'Descargar reporte'}
           </Button>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {}
        <Card className="rounded-2xl border-none shadow-sm relative overflow-hidden flex flex-col justify-between p-4 md:p-6">
           <div className="absolute top-0 left-0 w-full h-1 bg-[#0A2342]"></div>
           <div className="flex justify-between items-start mb-6">
             <div className="p-2.5 bg-blue-50/50 text-[#0A2342] rounded-xl"><Bus className="w-5 h-5"/></div>
           </div>
           <div>
             <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Flota Autorizada</p>
             <h3 className="text-4xl font-extrabold text-slate-900 leading-none">{kpis.flota_autorizada.toLocaleString()}</h3>
             <p className="text-[10px] font-bold text-slate-400 mt-2">Unidades activas en el padrón</p>
           </div>
        </Card>

        {}
        <Card className="rounded-2xl border-none shadow-sm relative overflow-hidden flex flex-col justify-between p-4 md:p-6">
           <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
           <div className="flex justify-between items-start mb-6">
             <div className="p-2.5 bg-blue-50/50 text-blue-500 rounded-xl"><ShieldCheck className="w-5 h-5"/></div>
             <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                  <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="100.5" strokeDashoffset={100.5 - (100.5 * (kpis.cumplimiento_soat / 100))} className="text-blue-500" />
                </svg>
                <div className="absolute flex items-center justify-center text-[9px] font-extrabold text-slate-700">{Math.round(kpis.cumplimiento_soat)}%</div>
             </div>
           </div>
           <div>
             <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Cumplimiento SOAT</p>
             <h3 className="text-4xl font-extrabold text-slate-900 leading-none">{kpis.cumplimiento_soat}%</h3>
             <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${kpis.cumplimiento_soat}%` }}></div>
             </div>
           </div>
        </Card>

        {}
        <Card className="rounded-2xl border-none shadow-sm relative overflow-hidden flex flex-col justify-between p-4 md:p-6">
           <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
           <div className="flex justify-between items-start mb-6">
             <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl"><FileText className="w-5 h-5"/></div>
           </div>
           <div>
             <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Trámites Este Mes</p>
             <h3 className="text-4xl font-extrabold text-slate-900 leading-none">{kpis.tramites_proceso}</h3>
             <p className="text-[10px] font-bold text-slate-400 mt-2">Permisos de circulación emitidos</p>
           </div>
        </Card>

        {}
        <Card className="rounded-2xl border-none shadow-sm relative overflow-hidden flex flex-col justify-between p-4 md:p-6">
           <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
           <div className="flex justify-between items-start mb-6">
             <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl"><TrendingUp className="w-5 h-5"/></div>
           </div>
           <div>
             <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Empresas Operando</p>
             <h3 className="text-4xl font-extrabold text-emerald-500 leading-none">{kpis.empresas_activas}</h3>
             <p className="text-[10px] font-bold text-slate-400 mt-2">Compañías de transporte activas</p>
           </div>
        </Card>

      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {}
        <Card className="rounded-2xl border-none shadow-sm lg:col-span-2 flex flex-col pt-6 px-6 pb-2">
           <div className="flex justify-between items-start mb-4">
              <div>
                 <h3 className="text-base font-extrabold text-slate-900">Crecimiento de la Flota</h3>
                 <p className="text-xs font-semibold text-slate-400 mt-0.5">Evolución de registros en los últimos 6 meses</p>
              </div>
              <div className="flex gap-4">
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#0A2342]"></div><span className="text-[9px] font-bold text-slate-500 uppercase">Vehículos</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-300"></div><span className="text-[9px] font-bold text-slate-500 uppercase">Mototaxis</span></div>
              </div>
           </div>
           <div className="w-full h-64 mt-4">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0A2342" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0A2342" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMoto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#93C5FD" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="vehiculos" stroke="#0A2342" strokeWidth={3} fillOpacity={1} fill="url(#colorVehicles)" />
                  <Area type="monotone" dataKey="mototaxis" stroke="#93C5FD" strokeWidth={3} fillOpacity={1} fill="url(#colorMoto)" />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </Card>

        {}
        <Card className="rounded-2xl border-none shadow-sm lg:col-span-1 flex flex-col p-4 md:p-6">
           <h3 className="text-base font-extrabold text-slate-900">Tipo de Servicio</h3>
           <p className="text-xs font-semibold text-slate-400 mt-0.5">Distribución por categoría</p>

           <div className="relative flex-1 w-full flex items-center justify-center min-h-[200px] mt-2 border-b border-slate-100 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={serviceData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={4} dataKey="value">
                       {serviceData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                       ))}
                    </Pie>
                 </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none mt-[-10px]">
                 <span className="text-2xl font-extrabold text-[#0A2342]">{kpis.flota_autorizada}</span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4 mt-6">
              {serviceData.map((item, idx) => (
                 <div key={idx} className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                       <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                       <span className="text-[10px] font-extrabold text-slate-800">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 ml-4">{kpis.flota_autorizada ? Math.round((item.value / kpis.flota_autorizada) * 100) : 0}% <span className="font-semibold text-slate-400">({item.value} ud)</span></span>
                 </div>
              ))}
           </div>
        </Card>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {}
        <Card className="rounded-2xl border-none shadow-sm p-4 md:p-6">
           <h3 className="text-base font-extrabold text-slate-900">Estado de Documentación</h3>
           <p className="text-xs font-semibold text-slate-400 mt-0.5 mb-8">Vigencia por categorías principales</p>

           <div className="space-y-6">

              <div className="space-y-2">
                 <div className="flex justify-between items-end">
                    <span className="text-xs font-extrabold text-slate-700">SOAT / CAT</span>
                    <span className="text-[10px] font-extrabold text-slate-500">{documentation.soat.valid} Vigentes de {documentation.soat.total}</span>
                 </div>
                 <div className="w-full bg-red-500 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-[#0A2342] h-full transition-all duration-1000" style={{ width: `${documentation.soat.total ? (documentation.soat.valid / documentation.soat.total * 100) : 0}%` }}></div>
                 </div>
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between items-end">
                    <span className="text-xs font-extrabold text-slate-700">Revisión Técnica</span>
                    <span className="text-[10px] font-extrabold text-slate-500">{documentation.rt.valid} Vigentes de {documentation.rt.total}</span>
                 </div>
                 <div className="w-full bg-red-500 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-[#0A2342] h-full transition-all duration-1000" style={{ width: `${documentation.rt.total ? (documentation.rt.valid / documentation.rt.total * 100) : 0}%` }}></div>
                 </div>
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between items-end">
                    <span className="text-xs font-extrabold text-slate-700">Licencias Operativas</span>
                    <span className="text-[10px] font-extrabold text-slate-500">{documentation.licencias.valid} Vigentes de {documentation.licencias.total}</span>
                 </div>
                 <div className="w-full bg-red-500 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-[#0A2342] h-full transition-all duration-1000" style={{ width: `${documentation.licencias.total ? (documentation.licencias.valid / documentation.licencias.total * 100) : 0}%` }}></div>
                 </div>
              </div>

           </div>

           <div className="flex items-center gap-6 mt-8 pt-6 border-t border-slate-100">
               <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#0A2342]"></div><span className="text-[10px] font-bold text-slate-500">Vigente</span></div>
               <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div><span className="text-[10px] font-bold text-slate-500">Vencido / Pendiente</span></div>
           </div>
        </Card>

        {}
        <Card className="rounded-2xl border-none shadow-sm flex flex-col p-4 md:p-6 overflow-x-auto">
           <h3 className="text-base font-extrabold text-slate-900">Ranking de Empresas</h3>
           <p className="text-xs font-semibold text-slate-400 mt-0.5 mb-6">Top cumplimiento y formalización</p>

           <div className="flex-1 min-w-[500px]">
             {}
             <div className="flex items-center px-2 pb-3 border-b border-slate-100 mb-2">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider w-[45%]">Empresa</span>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider w-[20%]">Flota</span>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider w-[20%]">Categoría</span>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider w-[15%] text-right">Cumplimiento</span>
             </div>

             {}
             <div className="space-y-1">
               {rankingData.map((empresa, idx) => (
                 <div key={idx} className="flex items-center py-2.5 px-2 hover:bg-slate-50 rounded-xl transition-colors">

                    <div className="w-[45%] flex items-center gap-3 pr-2">
                      <Avatar className={`h-8 w-8 rounded-lg shadow-sm border ${empresa.isWarning ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-[#0A2342]'}`}>
                         <AvatarFallback className={`text-[10px] font-extrabold ${empresa.isWarning ? 'text-amber-600 bg-transparent' : 'text-white bg-transparent'}`}>
                           {empresa.logo}
                         </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-extrabold text-slate-900 truncate">{empresa.name}</span>
                        <span className="text-[9px] font-semibold text-slate-400">RUC: {empresa.ruc}</span>
                      </div>
                    </div>

                    <div className="w-[20%] flex flex-col">
                       <span className="text-xs font-bold text-slate-700">{empresa.flota}</span>
                       <span className="text-[9px] font-semibold text-slate-500">Unidades</span>
                    </div>

                    <div className="w-[20%] flex items-center">
                       <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                         {empresa.categoria}
                       </span>
                    </div>

                    <div className="w-[15%] flex justify-end">
                       <span className={`text-xs font-black ${empresa.isWarning ? 'text-amber-500' : 'text-emerald-500'}`}>
                         {empresa.cumplimiento}%
                       </span>
                    </div>

                 </div>
               ))}
             </div>
           </div>

           <Button variant="ghost" className="w-full mt-4 text-[10px] font-extrabold text-[#0A2342] tracking-widest hover:bg-slate-50">VER TODOS LOS REGISTROS</Button>

        </Card>

      </div>
    </div>
  )
}
