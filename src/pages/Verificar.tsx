import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { apiClient } from '@/lib/api-client'
import { Verification } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Camera, CameraOff, Search, CheckCircle2, XCircle,
  AlertTriangle, Clock, ShieldCheck, ChevronLeft, ChevronRight,
  Loader2, RotateCw, ScanLine
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type SearchType = 'placa' | 'dni' | 'permiso'

interface VerifyResult {
  puede_circular: boolean
  razon: string
  bloqueos: string[]
  data?: Record<string, any>
}

interface VehiclePhoto {
  url: string
  sort_order: number
}

function VehiclePhotos({ vehicleId }: { vehicleId: number }) {
  const [photos, setPhotos] = useState<VehiclePhoto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiClient.getVehicleImages(vehicleId)
      .then((imgs) => { if (!cancelled) setPhotos(imgs) })
      .catch(() => { })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [vehicleId])

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100 w-full">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Camera className="w-3 h-3" /> Evidencia Fotográfica
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="aspect-video bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (photos.length === 0) return null

  const labels = ['Vista Frontal', 'Vista Lateral']

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 w-full">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <Camera className="w-3 h-3" /> Evidencia Fotográfica
      </p>
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, idx) => (
          <div key={photo.sort_order} className="flex flex-col gap-1">
            <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
              <img
                src={photo.url}
                alt={labels[idx] ?? `Foto ${idx + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
              {labels[idx] ?? `Foto ${idx + 1}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function VerificarPage() {

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerDivId = 'qr-scanner-region'

  const [searchType, setSearchType] = useState<SearchType>('placa')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const [result, setResult] = useState<VerifyResult | null>(null)

  const [history, setHistory] = useState<Verification[]>([])
  const [todayStats, setTodayStats] = useState<{ total: number; autorizados: number; rechazados: number } | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [page])

  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  async function loadHistory() {
    try {
      setLoadingHistory(true)
      const res = await apiClient.listVerifications({ page, limit: 10 })
      setHistory(res.data.data)
      setTotalPages(res.data.pagination.pages)
      if (res.data.today_stats) setTodayStats(res.data.today_stats)
    } catch {

    } finally {
      setLoadingHistory(false)
    }
  }

  async function doVerify(type: SearchType, query: string) {
    if (!query.trim()) {
      toast.error('Ingresa un valor para buscar')
      return
    }
    try {
      setLoading(true)
      setResult(null)
      const res = await apiClient.verifyTUC(type, query.trim().toUpperCase())
      setResult(res.data)
      await loadHistory()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al verificar')
    } finally {
      setLoading(false)
    }
  }

  async function startCamera() {
    setCameraError(null)
    setCameraActive(true)
    try {
      const html5QrCode = new Html5Qrcode(scannerDivId)
      scannerRef.current = html5QrCode
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {

          await stopCamera()

          const parts = decodedText.split('/')
          const lastPart = parts[parts.length - 1].trim().toUpperCase()
          setSearchQuery(lastPart)
          toast.info(`QR detectado: ${lastPart}`)

          const type = lastPart.startsWith('PERM-') || lastPart.startsWith('TUC-') ? 'permiso' : 'placa'
          await doVerify(type, lastPart)
        },
        undefined
      )
    } catch (err: any) {
      setCameraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
      setCameraActive(false)
    }
  }

  async function stopCamera() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      try { scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
    setCameraActive(false)
  }

  const placeholderMap: Record<SearchType, string> = {
    placa: 'Ej. ABC-123',
    dni: 'Ej. 12345678',
    permiso: 'Ej. TUC-2026-0042',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12 px-2">

      {}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0A2342]">Verificar Permiso (TUC)</h1>
        <p className="text-slate-500 font-medium mt-1 text-sm">
          Escanea el QR del vehículo o ingresa la placa / DNI del conductor.
        </p>
      </div>

      {}
      {todayStats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-extrabold text-[#0A2342]">{todayStats.total}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Total hoy</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
            <p className="text-2xl font-extrabold text-emerald-600">{todayStats.autorizados}</p>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">Autorizados</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 text-center border border-red-100">
            <p className="text-2xl font-extrabold text-red-600">{todayStats.rechazados}</p>
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-1">Rechazados</p>
          </div>
        </div>
      )}

      {}
      <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-[#0A2342]" />
              <span className="font-bold text-slate-800">Escanear con Cámara</span>
            </div>
            <Button
              onClick={cameraActive ? stopCamera : startCamera}
              variant={cameraActive ? 'destructive' : 'default'}
              size="sm"
              className={`rounded-xl font-bold ${!cameraActive ? 'bg-[#0A2342] hover:bg-[#0A2342]/90' : ''}`}
            >
              {cameraActive ? (
                <><CameraOff className="mr-2 h-4 w-4" />Detener</>
              ) : (
                <><Camera className="mr-2 h-4 w-4" />Abrir Cámara</>
              )}
            </Button>
          </div>

          {cameraError && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 font-medium">{cameraError}</p>
            </div>
          )}

          <div
            id={scannerDivId}
            className={`rounded-xl overflow-hidden bg-slate-900 ${cameraActive ? 'block' : 'hidden'}`}
            style={{ minHeight: cameraActive ? '300px' : '0' }}
          />

          {!cameraActive && !cameraError && (
            <div className="flex items-center justify-center h-28 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <div className="text-center">
                <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-400">Toca "Abrir Cámara" para escanear el QR</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {}
      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-5 h-5 text-[#0A2342]" />
            <span className="font-bold text-slate-800">Búsqueda Manual</span>
          </div>

          <div className="flex gap-2">
            <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
              <SelectTrigger className="w-36 h-12 rounded-xl bg-slate-50 border-slate-200 font-semibold shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="placa" className="font-medium">Placa</SelectItem>
                <SelectItem value="dni" className="font-medium">DNI</SelectItem>
                <SelectItem value="permiso" className="font-medium">Nº Permiso</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && doVerify(searchType, searchQuery)}
              placeholder={placeholderMap[searchType]}
              className="h-12 rounded-xl bg-slate-50 border-slate-200 font-mono font-bold text-[#0A2342] uppercase"
            />

            <Button
              onClick={() => doVerify(searchType, searchQuery)}
              disabled={loading}
              className="h-12 px-5 bg-[#0A2342] hover:bg-[#0A2342]/90 rounded-xl shrink-0"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {}
      {}
      {result && (
        <div className="flex flex-col items-center animate-in slide-in-from-bottom-4">
          <div className="relative z-10 bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100">
            {}
            <div className={`w-full py-2 text-center text-[10px] font-extrabold tracking-[0.2em] uppercase ${result.puede_circular ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              {result.puede_circular ? '✓ VIGENTE — AUTORIZADO' : '✗ NO AUTORIZADO'}
            </div>

            <div className="p-6 flex flex-col items-center">
              {}
              {result.data?.qr_code && result.data.qr_code !== 'FAKE_QR' ? (
                <div className="w-36 h-36 bg-white p-2 rounded-2xl border-4 border-slate-100 shadow-sm mb-4">
                  <img src={`data:image/png;base64,${result.data.qr_code}`} alt="QR TUC" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-36 h-36 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-4">
                  <ScanLine className="w-10 h-10 text-slate-300" />
                </div>
              )}

              {}
              <p className="font-mono text-sm font-extrabold text-slate-700 tracking-[0.2em] mb-5">
                {result.data?.numero_permiso || 'SIN PERMISO'}
              </p>

              {}
              {!result.puede_circular && result.bloqueos.length > 0 && (
                <div className="w-full mb-5 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Motivos de Rechazo</p>
                  {result.bloqueos.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 bg-red-50 p-2.5 rounded-xl border border-red-100">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-xs font-bold text-red-800 leading-tight">{b}</p>
                    </div>
                  ))}
                </div>
              )}

              {}
              {result.data && (
                <div className="w-full space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Placa</span>
                    <span className="text-xs font-extrabold text-[#0A2342] uppercase">{result.data.placa || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehículo</span>
                    <span className="text-xs font-extrabold text-[#0A2342] uppercase">{result.data.marca ? `${result.data.marca} ${result.data.modelo}` : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Empresa</span>
                    <span className="text-xs font-extrabold text-[#0A2342] uppercase truncate max-w-[60%] text-right">{result.data.empresa || 'Independiente'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conductor</span>
                    <span className="text-xs font-extrabold text-[#0A2342] uppercase truncate max-w-[60%] text-right">{result.data.nombre_completo || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DNI</span>
                    <span className="text-xs font-extrabold text-[#0A2342] uppercase">{result.data.dni || '—'}</span>
                  </div>
                  {result.data.permiso_vence && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Válido Hasta</span>
                      <span className="text-xs font-extrabold text-[#0A2342] uppercase">
                        {format(new Date(result.data.permiso_vence), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {}
              {result.data?.vehicle_id && <VehiclePhotos vehicleId={result.data.vehicle_id} />}
            </div>

            {}
            <div className={`w-full py-3 flex items-center justify-center gap-2 ${result.puede_circular ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {result.puede_circular ? (
                <><ShieldCheck className="w-4 h-4 text-emerald-600" /><span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest">Verificado MTC Marcona</span></>
              ) : (
                <><XCircle className="w-4 h-4 text-red-500" /><span className="text-[10px] font-extrabold text-red-600 uppercase tracking-widest">Verificación Rechazada</span></>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0A2342]" />
            <span className="font-bold text-slate-800">Mis Verificaciones</span>
          </div>
          <Button variant="ghost" size="icon" onClick={loadHistory} disabled={loadingHistory} className="h-9 w-9 rounded-xl">
            <RotateCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {history.length === 0 && !loadingHistory && (
          <div className="text-center py-8 text-slate-400 text-sm font-medium">
            No hay verificaciones registradas aún.
          </div>
        )}

        {history.map((v) => (
          <div
            key={v.id}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-colors ${
              v.resultado === 'autorizado'
                ? 'bg-emerald-50/60 border-emerald-100'
                : 'bg-red-50/60 border-red-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              v.resultado === 'autorizado' ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {v.resultado === 'autorizado'
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                : <XCircle className="w-4 h-4 text-red-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-800 font-mono">{v.search_query}</p>
              <p className="text-xs text-slate-500 font-medium capitalize">{v.search_type} · {format(new Date(v.created_at), 'dd MMM HH:mm', { locale: es })}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-md capitalize ${
              v.resultado === 'autorizado'
                ? 'text-emerald-700 bg-emerald-100'
                : 'text-red-700 bg-red-100'
            }`}>
              {v.resultado}
            </span>
          </div>
        ))}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-slate-600 flex items-center px-2">{page} / {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

    </div>
  )
}
