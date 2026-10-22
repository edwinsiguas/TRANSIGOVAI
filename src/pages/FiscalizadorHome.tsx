import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScanLine, CheckCircle2, XCircle, Clock, ShieldCheck, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Verification } from '@/types'

export function FiscalizadorHome() {
  const { user } = useAuth()
  const [todayStats, setTodayStats] = useState({ total: 0, autorizados: 0, rechazados: 0 })
  const [recent, setRecent] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.listVerifications({ page: 1, limit: 5 })
        setRecent(res.data.data)
        if (res.data.today_stats) setTodayStats(res.data.today_stats)
      } catch {

      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 px-2">

      {}
      <div>
        <p className="text-sm font-semibold text-slate-500">{greeting},</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0A2342]">
          {user?.nombre ?? 'Fiscalizador'}
        </h1>
        <p className="text-slate-500 text-sm font-medium mt-0.5">Inspector de Transporte · Municipalidad de Marcona</p>
      </div>

      {}
      <Link to="/verificar">
        <div className="relative bg-[#0A2342] rounded-3xl p-6 overflow-hidden shadow-xl cursor-pointer group hover:bg-[#0A2342]/90 transition-colors">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -right-2 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-400/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold mb-3">
                <ShieldCheck className="w-3 h-3" /> Sistema Activo
              </div>
              <h2 className="text-white text-2xl font-extrabold leading-tight">Verificar Permiso</h2>
              <p className="text-white/60 text-sm font-medium mt-1">Escanea QR o busca por placa / DNI</p>
            </div>
            <div className="bg-white/10 p-5 rounded-2xl group-hover:scale-105 transition-transform">
              <ScanLine className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
      </Link>

      {}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Actividad de Hoy</p>
        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-[#0A2342]">{loading ? '—' : todayStats.total}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Total</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-emerald-50">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-emerald-600">{loading ? '—' : todayStats.autorizados}</p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">OK</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-red-50">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-red-600">{loading ? '—' : todayStats.rechazados}</p>
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-1">Rechazados</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Últimas Verificaciones</p>
          </div>
          <Link to="/verificar">
            <Button variant="ghost" size="sm" className="text-xs font-bold text-[#0A2342] h-7 rounded-lg">
              Ver todas <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>

        {loading && (
          <div className="text-center py-8 text-slate-400 text-sm">Cargando...</div>
        )}

        {!loading && recent.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm font-medium bg-slate-50 rounded-2xl">
            Sin verificaciones hoy. ¡Toca el botón azul para empezar!
          </div>
        )}

        {recent.map((v) => (
          <div
            key={v.id}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
              v.resultado === 'autorizado'
                ? 'bg-emerald-50/60 border-emerald-100'
                : 'bg-red-50/60 border-red-100'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              v.resultado === 'autorizado' ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {v.resultado === 'autorizado'
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                : <XCircle className="w-5 h-5 text-red-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base text-slate-800 font-mono leading-tight">{v.search_query}</p>
              <p className="text-xs text-slate-500 font-medium capitalize">
                {v.search_type} · {format(new Date(v.created_at), "dd MMM 'a las' HH:mm", { locale: es })}
              </p>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize shrink-0 ${
              v.resultado === 'autorizado'
                ? 'text-emerald-700 bg-emerald-100'
                : 'text-red-700 bg-red-100'
            }`}>
              {v.resultado}
            </span>
          </div>
        ))}
      </div>

    </div>
  )
}
