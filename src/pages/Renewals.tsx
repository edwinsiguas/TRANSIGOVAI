import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { toast } from 'sonner'
import { Search, ShieldCheck, ShieldAlert, CheckCircle2, RotateCw, AlertTriangle, FileText, Clock, ArrowRight, Lock } from 'lucide-react'

const renewalSchema = z.object({
  numero_recibo: z.string().min(1, 'Número de recibo es obligatorio'),
  monto_pagado: z.string().min(1, 'Monto es obligatorio').refine(v => !isNaN(parseFloat(v)), 'Debe ser un número válido'),
  observaciones: z.string().optional()
})

type RenewalFormData = z.infer<typeof renewalSchema>

interface ValidationData {
  vehicle_id: number
  placa: string
  marca: string
  modelo: string
  estado_vehiculo: string
  driver_id: number
  nombre_completo: string
  dni: string
  estado_conductor: string
  fecha_vencimiento_licencia: string | null
  soat_vencimiento: string | null
  rt_vencimiento: string | null
  permit_id: number | null
  numero_permiso: string | null
  estado_permiso: string | null
  assignment_id: number | null
}

export function RenewalsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationData, setValidationData] = useState<ValidationData | null>(null)
  const [expiringPermits, setExpiringPermits] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(true)

  useEffect(() => {
    async function fetchExpiring() {
      try {
         setLoadingList(true)
         const res = await apiClient.listPermits({ expiring_soon: 1, limit: 50 })
         setExpiringPermits(res.data?.data || [])
      } catch (err) {
         console.error('Error fetching expiring permits', err)
      } finally {
         setLoadingList(false)
      }
    }
    fetchExpiring()
  }, [])

  const form = useForm<RenewalFormData>({
    resolver: zodResolver(renewalSchema),
    defaultValues: { numero_recibo: '', monto_pagado: '', observaciones: '' }
  })

  async function handleQuickSearch(placa: string) {
    if (!placa.trim()) return
    setLoading(true)
    setValidationData(null)
    form.reset()

    try {
      const res = await apiClient.validateCirculation({ placa })

      if (!res.data || !res.data.data) {
         toast.error(res.message || 'No se encontraron datos de vinculación (SOAT, RT, etc) para la placa ingresada')
         return
      }

      setValidationData(res.data.data)
      toast.success(res.data.razon || 'Información recuperada')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al buscar vehículo')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    handleQuickSearch(searchTerm)
  }

  async function onSubmit(data: RenewalFormData) {
    if (!validationData?.permit_id) {
      toast.error('No hay un permiso anterior para renovar')
      return
    }

    try {
      setLoading(true)
      await apiClient.renewPermit(validationData.permit_id, {
        numero_recibo: data.numero_recibo,
        monto_pagado: parseFloat(data.monto_pagado),
        observaciones: data.observaciones
      })
      toast.success('Permiso de circulación renovado exitosamente')
      setValidationData(null)
      setSearchTerm('')
      form.reset()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al procesar renovación')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const isSoatValid = validationData?.soat_vencimiento && validationData.soat_vencimiento >= today
  const isRtValid = validationData?.rt_vencimiento && validationData.rt_vencimiento >= today
  const isLicenseValid = validationData?.fecha_vencimiento_licencia && validationData.fecha_vencimiento_licencia >= today
  const isAssignmentActive = !!validationData?.assignment_id

  const allValid = isSoatValid && isRtValid && isLicenseValid && isAssignmentActive

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-12">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0A2342]">Renovar Permiso de Circulación</h1>
          <p className="text-slate-500 font-medium">Busque la placa del vehículo para extender la vigencia del permiso</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl">
           <RotateCw className="w-5 h-5" />
           <span className="font-semibold text-sm">Módulo de Renovación</span>
        </div>
      </div>

      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-8">
          <form onSubmit={handleSearch} className="flex gap-4">
               <Input
                  className="h-14 text-lg border-slate-300 focus-visible:ring-indigo-500 rounded-xl"
                  placeholder="Ingrese el número de placa (Ej: P3G-445)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
               />
               <Button type="submit" disabled={loading} className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md text-lg font-bold">
                  {loading ? <RotateCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
                  Consultar
               </Button>
          </form>
        </CardContent>
      </Card>

      {!validationData && (
         <div className="mt-8 space-y-4 animate-in fade-in duration-500">
           <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-800">Permisos Vencidos o por Vencer (Próximos 7 días)</h2>
           </div>

           <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {loadingList ? (
                   <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                      <RotateCw className="w-8 h-8 animate-spin mb-2 text-indigo-400" />
                      <p>Cargando lista de permisos...</p>
                   </div>
                ) : expiringPermits.length === 0 ? (
                   <div className="p-8 text-center text-emerald-600 bg-emerald-50 font-medium flex flex-col items-center">
                      <CheckCircle2 className="w-8 h-8 mb-2 focus:ring-0 opacity-80" />
                      No hay permisos vencidos ni próximos a vencer. Todo está al día.
                   </div>
                ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Vehículo</th>
                            <th className="px-6 py-4">Conductor</th>
                            <th className="px-6 py-4">Empresa</th>
                            <th className="px-6 py-4">Vencimiento</th>
                            <th className="px-6 py-4 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {expiringPermits.map((p) => {
                             const isExpired = new Date(p.fecha_vencimiento) < new Date()
                             return (
                               <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                 <td className="px-6 py-4">
                                    <p className="font-bold text-slate-800">{p.placa}</p>
                                    <p className="text-xs text-slate-500">{p.marca} {p.modelo}</p>
                                 </td>
                                 <td className="px-6 py-4 font-medium text-slate-700">{p.nombre_completo || 'Sin Conductor'}</td>
                                 <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]">{p.empresa || 'Particular'}</td>
                                 <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center w-fit gap-1 ${isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                      {isExpired ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                      {p.fecha_vencimiento}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    {isAdmin ? (
                                       <Button
                                          size="sm"
                                          className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-none border border-indigo-200"
                                          onClick={() => {
                                             setSearchTerm(p.placa)
                                             handleQuickSearch(p.placa)
                                          }}
                                       >
                                          Renovar <ArrowRight className="w-4 h-4 ml-1" />
                                       </Button>
                                    ) : (
                                       <span className="text-xs text-slate-400 italic px-2">Solo Admin</span>
                                    )}
                                 </td>
                               </tr>
                             )
                          })}
                        </tbody>
                     </table>
                   </div>
                )}
              </CardContent>
           </Card>
         </div>
      )}

      {validationData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">

          {}
          <div className="col-span-1 space-y-4">
             <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                 <ShieldCheck className="w-5 h-5 text-indigo-500" /> Muro de Validación
             </h3>
             <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4 border border-slate-100">

                {}
                <div className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${isAssignmentActive ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                   {isAssignmentActive ? <CheckCircle2 className="text-emerald-500" /> : <AlertTriangle className="text-red-500" />}
                   <div>
                       <p className="text-xs font-bold text-slate-800">Conductor Asignado</p>
                       <p className={`text-xs ${isAssignmentActive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isAssignmentActive ? validationData.nombre_completo : 'Sin asignación activa para operar'}
                       </p>
                   </div>
                </div>

                {}
                <div className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${isSoatValid ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                   {isSoatValid ? <CheckCircle2 className="text-emerald-500" /> : <ShieldAlert className="text-red-500" />}
                   <div>
                       <p className="text-xs font-bold text-slate-800">SOAT Vigente</p>
                       <p className={`text-xs ${isSoatValid ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isSoatValid ? `Vence: ${validationData.soat_vencimiento}` : 'SOAT Vencido o Inválido'}
                       </p>
                   </div>
                </div>

                {}
                <div className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${isRtValid ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                   {isRtValid ? <CheckCircle2 className="text-emerald-500" /> : <ShieldAlert className="text-red-500" />}
                   <div>
                       <p className="text-xs font-bold text-slate-800">Revisión Técnica</p>
                       <p className={`text-xs ${isRtValid ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isRtValid ? `Vence: ${validationData.rt_vencimiento}` : 'Revisión Vencida'}
                       </p>
                   </div>
                </div>

                {}
                <div className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${isLicenseValid ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                   {isLicenseValid ? <CheckCircle2 className="text-emerald-500" /> : <ShieldAlert className="text-red-500" />}
                   <div>
                       <p className="text-xs font-bold text-slate-800">Licencia del Conductor</p>
                       <p className={`text-xs ${isLicenseValid ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isLicenseValid ? `Vence: ${validationData.fecha_vencimiento_licencia}` : 'Licencia Vencida'}
                       </p>
                   </div>
                </div>
             </div>
          </div>

          {}
          <div className="col-span-1 lg:col-span-2 space-y-4">
             <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                 <FileText className="w-5 h-5 text-indigo-500" /> Datos y Procesamiento
             </h3>
             <Card className="rounded-2xl border-none shadow-sm overflow-hidden relative">
               {/* Bloqueo: requisitos incompletos (solo visible para admin) */}
               {!allValid && isAdmin && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-8">
                     <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
                     <h4 className="text-lg font-bold text-slate-800">Requisitos Incompletos</h4>
                     <p className="text-sm text-slate-600 max-w-md">Debe subsanar las alertas rojas en el muro de validación para proceder con el pago y renovación del permiso.</p>
                  </div>
               )}
               {/* Bloqueo: sin permiso de rol admin */}
               {!isAdmin && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-8 rounded-2xl">
                     <Lock className="w-12 h-12 text-slate-400 mb-3" />
                     <h4 className="text-lg font-bold text-slate-700">Acción Restringida</h4>
                     <p className="text-sm text-slate-500 max-w-sm mt-1">Solo un <span className="font-bold text-slate-700">Administrador</span> puede procesar renovaciones. Contacte al responsable del sistema.</p>
                  </div>
               )}
               <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                     <div>
                       <p className="text-sm font-semibold text-slate-400">VEHÍCULO</p>
                       <p className="text-xl font-black text-[#0A2342]">{validationData.placa}</p>
                       <p className="text-sm font-medium text-slate-600">{validationData.marca} {validationData.modelo}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-semibold text-slate-400">PERMISO ACTUAL</p>
                       <p className={`text-lg font-bold ${validationData.numero_permiso ? 'text-[#0A2342]' : 'text-slate-400 italic'}`}>
                          {validationData.numero_permiso || 'N/A'}
                       </p>
                       <p className="text-sm text-slate-500 capitalize">{validationData.estado_permiso || 'Sin Permiso'}</p>
                     </div>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="numero_recibo" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold text-slate-700">Número de Recibo / Voucher</FormLabel>
                              <FormControl>
                                <Input className="h-12 border-slate-300" placeholder="Ej: 015-442211" {...field} />
                              </FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="monto_pagado" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold text-slate-700">Monto Pagado (S/)</FormLabel>
                              <FormControl>
                                <Input className="h-12 border-slate-300" type="number" step="0.01" placeholder="0.00" {...field} />
                              </FormControl>
                            </FormItem>
                          )} />
                       </div>
                       <FormField control={form.control} name="observaciones" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-slate-700">Observaciones (Opcional)</FormLabel>
                            <FormControl>
                              <Input className="h-12 border-slate-300" placeholder="Abreviaturas, referencias..." {...field} />
                            </FormControl>
                          </FormItem>
                       )} />

                       <div className="pt-6">
                          <Button
                             type="submit"
                             disabled={loading || !allValid || !isAdmin}
                             className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl shadow-lg text-lg font-bold transition-all"
                          >
                             {loading ? 'Procesando Transacción...' : 'Aprobar Renovación por 1 Año'}
                          </Button>
                       </div>
                    </form>
                  </Form>
               </CardContent>
             </Card>
          </div>
        </div>
      )}
    </div>
  )
}
