import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShieldCheck, ShieldX, QrCode, AlertTriangle, Camera } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface ValidatedPermit {
  vehicle_id?: number
  placa: string
  marca: string
  modelo: string
  nombre_completo: string
  dni: string
  empresa: string | null
  numero_permiso: string
  tipo_permiso: string
  permiso_vence: string
  estado_permiso: string
  qr_code: string | null
  verificado: boolean
  razon: string
}

interface VehiclePhoto {
  url: string
  sort_order: number
}

type PageState = 'loading' | 'valid' | 'invalid' | 'error'

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-b-0">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-xs font-extrabold text-[#0A2342] text-right max-w-[55%] truncate uppercase">{value || '—'}</span>
    </div>
  )
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
      <div className="mt-5 pt-4 border-t border-slate-100">
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
    <div className="mt-5 pt-4 border-t border-slate-100">
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

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A2342]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white mb-4" />
      <p className="text-blue-200 font-semibold text-sm">Verificando TUC...</p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-6 text-center">
      <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Error de Verificación</h2>
      <p className="text-slate-500 text-sm font-medium">{message}</p>
      <Link to="/consulta" className="mt-6 text-sm font-bold text-[#0A2342] underline">
        Ir al Portal de Consulta
      </Link>
    </div>
  )
}

function InvalidState({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-6 text-center">
      <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-5 shadow-inner">
        <ShieldX className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Permiso No Habilitado</h2>
      <p className="text-slate-500 text-sm font-semibold bg-red-50 border border-red-100 px-4 py-3 rounded-xl max-w-sm">
        {reason}
      </p>
      <img src="/Marcona_Escudo.png" alt="Escudo" className="w-10 h-10 mt-8 opacity-30" />
      <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Municipalidad Distrital de Marcona</p>
    </div>
  )
}

function ValidState({ permit }: { permit: ValidatedPermit }) {
  const isVigente = permit.estado_permiso === 'vigente'

  return (
    <div className="min-h-screen bg-[#0A2342] flex flex-col items-center py-10 px-4 relative overflow-hidden">
      {}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen opacity-10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500 rounded-full mix-blend-screen opacity-10 blur-3xl pointer-events-none" />

      {}
      <div className="relative z-10 flex flex-col items-center mb-6">
        <img src="/Marcona_Escudo.png" alt="Escudo Marcona" className="w-20 h-20 object-contain drop-shadow-lg mb-3" />
        <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-blue-300">Municipalidad de Marcona</p>
        <h1 className="text-2xl font-extrabold text-white tracking-tight text-center mt-1 leading-tight">
          Tarjeta Única de<br />Circulación Electrónica
        </h1>
      </div>

      {}
      <div className="relative z-10 bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">

        {}
        <div className={`w-full py-2 text-center text-[10px] font-extrabold tracking-[0.2em] uppercase ${isVigente ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {isVigente ? '✓  VIGENTE — AUTORIZADO PARA CIRCULAR' : `✗  ${permit.estado_permiso?.toUpperCase()}`}
        </div>

        <div className="p-6 flex flex-col items-center">
          {}
          {permit.qr_code && permit.qr_code !== 'FAKE_QR' ? (
            <div className="w-36 h-36 bg-white p-2 rounded-2xl border-4 border-slate-100 shadow-md mb-4">
              <img src={`data:image/png;base64,${permit.qr_code}`} alt="QR TUC" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-36 h-36 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-4">
              <QrCode className="w-10 h-10 text-slate-300" />
            </div>
          )}

          {}
          <p className="font-mono text-sm font-extrabold text-slate-700 tracking-[0.2em] mb-5">
            {permit.numero_permiso}
          </p>

          {}
          <div className="w-full">
            <InfoRow label="Placa" value={permit.placa} />
            <InfoRow label="Vehículo" value={`${permit.marca} ${permit.modelo}`} />
            <InfoRow label="Empresa / Operador" value={permit.empresa || 'Independiente'} />
            <InfoRow label="Titular / Conductor" value={permit.nombre_completo} />
            <InfoRow label="DNI" value={permit.dni} />
            <InfoRow label="Tipo de Servicio" value={permit.tipo_permiso?.replace(/_/g, ' ')} />
            <InfoRow label="Válido Hasta" value={formatDate(permit.permiso_vence)} />
          </div>

          {}
          {permit.vehicle_id && <VehiclePhotos vehicleId={permit.vehicle_id} />}
        </div>

        {}
        <div className={`w-full py-3 flex items-center justify-center gap-2 ${isVigente ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {isVigente ? (
            <><ShieldCheck className="w-4 h-4 text-emerald-600" /><span className="text-xs font-extrabold text-emerald-700 uppercase tracking-widest">Verificado MTC Marcona</span></>
          ) : (
            <><ShieldX className="w-4 h-4 text-red-500" /><span className="text-xs font-extrabold text-red-600 uppercase tracking-widest">Permiso No Vigente</span></>
          )}
        </div>
      </div>

      {}
      <p className="relative z-10 text-blue-300 text-[10px] font-semibold mt-4 tracking-widest">
        Verificado el {new Date().toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
    </div>
  )
}

export function TucPublicaPage() {
  const { numero } = useParams<{ numero: string }>()
  const [state, setState] = useState<PageState>('loading')
  const [permit, setPermit] = useState<ValidatedPermit | null>(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!numero) {
      setState('error')
      setReason('Número de permiso no especificado.')
      return
    }

    apiClient.verifyPermit({ numero_permiso: numero })
      .then((res) => {
        if (res.success && res.data) {

          const merged: ValidatedPermit = { ...res.data.data, ...res.data }
          setPermit(merged)
          setState(res.data.verificado ? 'valid' : 'invalid')
          setReason(res.data.razon ?? '')
        } else {
          setState('invalid')
          setReason(res.message ?? 'No se encontraron resultados.')
        }
      })
      .catch((err: any) => {
        setState('error')
        setReason(err?.response?.data?.message ?? 'Error al conectar con el servidor.')
      })
  }, [numero])

  if (state === 'loading') return <LoadingState />
  if (state === 'error')   return <ErrorState message={reason} />
  if (state === 'invalid') return <InvalidState reason={reason} />
  if (state === 'valid' && permit) return <ValidState permit={permit} />
  return null
}
