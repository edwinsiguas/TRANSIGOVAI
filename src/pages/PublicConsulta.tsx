import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Search, XCircle, QrCode } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiClient } from '@/lib/api-client'
import { Permit } from '@/types'

export function PublicConsultaPage() {
  const [searchType, setSearchType] = useState('placa')
  const [searchValue, setSearchValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ valid: boolean, permit?: Permit, reason?: string } | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchValue.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const payload: any = {}
      if (searchType === 'placa') payload.placa = searchValue
      if (searchType === 'dni') payload.dni = searchValue
      if (searchType === 'numero_permiso') payload.numero_permiso = searchValue

      const res = await apiClient.verifyPermit(payload)

      if (res.success && res.data) {
        setResult({
          valid: res.data.verificado,
          permit: res.data.data,
          reason: res.data.razon || res.message
        })
      } else {
        setResult({ valid: false, reason: res.message || 'No se encontraron resultados.' })
      }
    } catch (err: any) {
      console.error(err)
      setResult({ valid: false, reason: err.response?.data?.message || 'Error al conectar con el servidor.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      {}
      <div className="w-full max-w-2xl text-center mb-8">
        <img src="/Marcona_Escudo.png" alt="Escudo Marcona" className="w-24 h-24 mx-auto object-contain drop-shadow-md mb-4" />
        <h2 className="text-3xl font-extrabold text-[#0A2342] tracking-tight">Portal de Transparencia</h2>
        <p className="mt-2 text-sm font-medium text-slate-500 max-w-md mx-auto">
          Consulta pública de vigencia de la Tarjeta Única de Circulación Electrónica (TUC) de la Municipalidad Distrital de Marcona.
        </p>
      </div>

      {}
      <Card className="w-full max-w-2xl rounded-3xl border-none shadow-xl shadow-slate-200/50 overflow-hidden relative z-10">
        <div className="h-1.5 w-full bg-[#0A2342] absolute top-0"></div>
        <CardContent className="p-8">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 block">Tipo de Búsqueda</label>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger className="h-14 rounded-xl bg-slate-50 border-slate-200 font-bold text-[#0A2342]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-semibold">
                    <SelectItem value="placa">Placa del Vehículo</SelectItem>
                    <SelectItem value="dni">DNI del Conductor</SelectItem>
                    <SelectItem value="numero_permiso">Nº de Permiso (TUC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-2/3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 block">Valor a Consultar</label>
                <div className="relative">
                  <Input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
                    className="h-14 rounded-xl bg-slate-50 border-slate-200 pl-4 pr-12 font-bold text-lg text-slate-900"
                    placeholder={
                      searchType === 'placa' ? 'Ej: ABC-123' :
                      searchType === 'dni' ? 'Ej: 71234567' : 'Ej: PM-00001'
                    }
                  />
                  <div className="absolute right-4 top-4 text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!searchValue.trim() || loading}
              className="w-full h-14 rounded-xl bg-[#0A2342] hover:bg-blue-900 text-white font-bold text-lg transition-all"
            >
              {loading ? 'Consultando Base de Datos...' : 'Verificar TUC Ahora'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {}
      {result && (
        <div className="w-full max-w-2xl mt-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          {result.valid && result.permit ? (

            <div className="bg-[#0A2342] text-white flex flex-col items-center p-8 relative overflow-hidden rounded-3xl shadow-2xl">
              {}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 rounded-full mix-blend-screen opacity-20 blur-xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500 rounded-full mix-blend-screen opacity-10 blur-xl"></div>

              <img src="/Marcona_Escudo.png" alt="Escudo Marcona" className="opacity-90 w-16 h-16 object-contain drop-shadow-sm mb-4 relative z-10" />
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 mb-1 relative z-10">Municipalidad de Marcona</h3>
              <h2 className="text-xl font-extrabold tracking-tight mb-6 relative z-10 text-center leading-tight">Tarjeta Única de<br />Circulación Electrónica</h2>

              <div className="bg-white text-slate-900 w-full rounded-2xl p-6 relative z-10 shadow-xl overflow-hidden flex flex-col items-center">
                {}
                <div className={`absolute top-0 left-0 w-full py-1.5 text-center text-[9px] font-extrabold tracking-widest uppercase ${result.permit.estado_permiso === 'vigente' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {result.permit.estado_permiso}
                </div>

                {result.permit.qr_code && result.permit.qr_code !== 'FAKE_QR' ? (
                  <div className="w-40 h-40 bg-white p-2 rounded-xl border-4 border-slate-100 shadow-sm mt-4 mb-4">
                    <img src={`data:image/png;base64,${result.permit.qr_code}`} alt="QR Code Oficial" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-slate-100 p-2 rounded-xl border border-slate-200 mt-4 mb-4 flex items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12 opacity-50" />
                  </div>
                )}

                <span className="font-mono text-sm font-extrabold text-slate-800 tracking-[0.2em] mb-4">
                  {result.permit.numero_permiso}
                </span>

                <div className="w-full space-y-3 mt-2 text-left">
                  <div className="flex flex-col border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidad Vehicular</span>
                    <p className="font-extrabold text-[#0A2342] text-sm uppercase">Placa: {result.permit.placa}</p>
                    <p className="font-semibold text-slate-600 text-xs">{result.permit.marca} {result.permit.modelo}</p>
                  </div>
                  <div className="flex flex-col border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Empresa / Operador</span>
                    <p className="font-extrabold text-[#0A2342] text-sm">{result.permit.empresa || result.permit.company_nombre || 'Independiente'}</p>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Titular</span>
                    <span className="text-xs font-extrabold text-[#0A2342] text-right truncate max-w-[150px] uppercase">{result.permit.nombre_completo || 'No asignado'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Servicio</span>
                    <span className="text-xs font-extrabold text-[#0A2342] capitalize">{result.permit.tipo_permiso?.replace('_', ' ') || 'Libre Tránsito'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Válido Hasta</span>
                    <span className="text-xs font-extrabold text-[#0A2342]">
                      {result.permit.permiso_vence ? new Date(result.permit.permiso_vence).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : 'No definido'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 bg-emerald-500/20 text-emerald-200 px-4 py-2 rounded-full text-xs font-bold w-full">
                <ShieldCheck className="w-4 h-4" /> Verificación MTC Exitosa
              </div>
            </div>
          ) : (

            <div className="bg-white rounded-3xl p-8 border border-red-100 shadow-xl shadow-red-100/50 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Permiso No Vigente</h3>
              <p className="text-slate-500 font-medium">{result.reason}</p>
            </div>
          )}
        </div>
      )}

      {}
      <div className="mt-12 text-center">
        <Link to="/login" className="text-sm font-semibold text-[#0A2342] hover:underline">
          Acceso para Funcionarios MTC →
        </Link>
      </div>
    </div>
  )
}
