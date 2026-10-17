import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { Permit, Vehicle } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { QrCode, FileCheck, Loader2, Download, Search, Filter, RotateCw, Eye, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, ChevronsUpDown, Check, RefreshCw, Printer } from 'lucide-react'
import { isDateFuture } from '@/lib/validation'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { DocBadge } from '@/components/ui/DocBadge'
import { PermisoCarnet } from '@/components/PermisoCarnet'
import { downloadJavaExcelReport } from '@/lib/java-report-client'

const permitSchema = z.object({
  vehicle_id: z.coerce.number().min(1, 'Selecciona un vehículo'),
  fecha_vencimiento: z.string().min(1, 'Selecciona fecha de vencimiento').refine(isDateFuture, 'La fecha de vencimiento debe ser posterior a hoy'),
  tipo_permiso: z.enum(['libre_transito', 'ruta_fija', 'carga', 'especial']).default('libre_transito'),
  observaciones: z.string().trim().max(300, 'Máximo 300 caracteres').optional(),
})

type PermitFormData = z.infer<typeof permitSchema>

export function PermitsPage() {
  const [permits, setPermits] = useState<Permit[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [vehicleSearch, setVehicleSearch] = useState('')

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const limit = 10

  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'vigente' | 'vencido'>('todos')

  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null)
  const [showPermitDetail, setShowPermitDetail] = useState(false)
  const [showCarnetPrint, setShowCarnetPrint] = useState(false)
  const [selectedCarnetPermit, setSelectedCarnetPermit] = useState<Permit | null>(null)

  const defaultValues = {
    vehicle_id: 0,
    fecha_vencimiento: '',
    tipo_permiso: 'libre_transito' as const,
    observaciones: '',
  }

  const form = useForm<PermitFormData>({
    resolver: zodResolver(permitSchema),
    defaultValues,
  })

  useEffect(() => {
    loadPermits()
  }, [page, search, estadoFilter])

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadPermits() {
    try {
      setLoading(true)
      const response = await apiClient.listPermits({ page, limit, search })

      let data = response.data.data
      if (estadoFilter !== 'todos') {
        data = data.filter((p: Permit) => p.estado === estadoFilter)
      }

      setPermits(data)
      setTotalPages(response.data.pagination.pages)
      setTotalRecords(response.data.pagination.total)
    } catch (error) {
      toast.error('Error al cargar permisos')
    } finally {
      setLoading(false)
    }
  }

  async function loadVehicles() {
    try {

      const response = await apiClient.listVehicles({ limit: 500, page: 1 })

      setVehicles(response.data.data)
    } catch (error) {
      toast.error('Error al cargar vehículos')
    }
  }

  async function onSubmit(data: PermitFormData) {
    try {
      setLoading(true)
      await apiClient.generatePermit(data)
      toast.success('TUC / Permiso generado exitosamente')
      form.reset(defaultValues)
      setIsDialogOpen(false)
      loadPermits()
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error al generar permiso'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function onInvalidSubmit() {
    toast.error('Corrige los campos del formulario de permiso')
  }

  async function viewPermitDetail(permit: Permit) {
    try {
      setLoading(true)
      const response = await apiClient.getPermit(permit.id)
      setSelectedPermit(response.data)
      setShowPermitDetail(true)
    } catch (error) {
      toast.error('Error al obtener detalles del permiso')
    } finally {
      setLoading(false)
    }
  }

  async function renewPermit(permit: Permit) {
    const nueva = prompt(`Renovar permiso ${permit.numero_permiso}\nIngresa la nueva fecha de vencimiento (YYYY-MM-DD):`)
    if (!nueva) return
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    if (new Date(nueva + 'T00:00:00') <= hoy) {
      toast.error('La fecha debe ser posterior a hoy')
      return
    }
    try {
      setLoading(true)
      // Crear nuevo permiso para el mismo vehículo con la nueva fecha
      await apiClient.generatePermit({ vehicle_id: permit.vehicle_id, fecha_vencimiento: nueva, tipo_permiso: permit.tipo_permiso || 'libre_transito' })
      toast.success('Permiso renovado correctamente')
      loadPermits()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al renovar permiso')
    } finally {
      setLoading(false)
    }
  }

  function downloadPermitPDF(_permit: Permit) {
    toast.info('Función de descarga PDF en desarrollo (Conexión a Impresora Térmica pendiente)')
  }

  async function openCarnetPrint(permit: Permit) {
    try {
      setLoading(true)
      const response = await apiClient.getPermit(permit.id)
      setSelectedCarnetPermit(response.data)
      setShowCarnetPrint(true)
    } catch (error) {
      toast.error('Error al cargar el carnet')
    } finally {
      setLoading(false)
    }
  }

  async function downloadExcel() {
    try {
      setLoading(true)
      toast.info('Generando reporte con Java...')
      const response = await apiClient.exportPermits({
        search: search.trim(),
        estado: estadoFilter
      })
      
      if (!response.data || response.data.length === 0) {
        toast.error('No hay datos para exportar')
        return
      }

      const excelData = response.data.map((p: any) => ({
        'Nº Permiso': p.numero_permiso,
        'Placa': p.placa,
        'Vehículo': `${p.marca} ${p.modelo}`,
        'Conductor': p.conductor || 'Sin Asignar',
        'Empresa': p.empresa || 'Independiente',
        'Fecha Emisión': p.fecha_emision,
        'Fecha Vencimiento': p.fecha_vencimiento,
        'Estado': String(p.estado ?? '').toUpperCase()
      }))

      await downloadJavaExcelReport(
        'Reporte de permisos MTC Marcona',
        excelData,
        'Reporte_Permisos_Java',
      )
      toast.success('Reporte Excel generado con Java y descargado correctamente')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al generar el reporte Excel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">

      {}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0A2342] uppercase">Credencial del conductor</h1>
          <p className="text-slate-500 font-medium mt-1 max-w-2xl">
            Generación y control de Tarjetas Únicas de Circulación habilitadas mediante código QR encriptado.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={downloadExcel} 
            disabled={loading}
            variant="outline" 
            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 h-14 px-6 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              <div className="flex flex-col items-start leading-tight">
                <span className="font-bold text-sm">Descargar</span>
                <span className="font-bold text-sm">Reporte</span>
              </div>
            </div>
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => form.reset(defaultValues)} className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white font-semibold shadow-md py-6 px-6 rounded-xl shrink-0">
                <QrCode className="mr-2 h-5 w-5 opacity-90" /> Emitir Nuevo Permiso
              </Button>
            </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-lg overflow-y-auto rounded-2xl">
            <DialogHeader className="pt-2 px-2">
              <DialogTitle className="text-2xl font-extrabold text-[#0A2342]">Emisión de Permiso Oficial</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-5 px-2 pb-2 mt-4">

                <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 flex items-start gap-3 mb-2">
                  <FileCheck className="w-5 h-5 text-sky-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-sky-900">Validación Automática</p>
                    <p className="text-[10px] sm:text-xs font-medium text-sky-700 mt-0.5">Asegúrese de que el vehículo tenga revisión técnica y SOAT vigentes previos a la emisión.</p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="vehicle_id"
                  render={({ field }) => {
                    const selected = vehicles.find((v) => v.id === field.value)
                    const filtered = vehicles.filter((v) =>
                      v.placa.toLowerCase().includes(vehicleSearch.toLowerCase())
                    )
                    return (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700">Vehículo a Autorizar</FormLabel>
                        <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={`w-full h-12 justify-between rounded-xl bg-slate-50 border-slate-200 font-semibold hover:bg-slate-100 ${
                                  !selected ? 'text-slate-400 font-normal' : 'text-slate-900'
                                }`}
                              >
                                {selected ? (
                                  <span><span className="font-mono font-extrabold">{selected.placa}</span> — {selected.marca} {selected.modelo}</span>
                                ) : (
                                  'Buscar por placa...'
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl border-none shadow-xl" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Escribir placa..."
                                value={vehicleSearch}
                                onValueChange={setVehicleSearch}
                                className="h-11"
                              />
                              <CommandList className="max-h-56">
                                <CommandEmpty className="py-4 text-sm text-center text-slate-500">No se encontró ningún vehículo.</CommandEmpty>
                                <CommandGroup>
                                  {filtered.slice(0, 50).map((v) => (
                                    <CommandItem
                                      key={v.id}
                                      value={String(v.id)}
                                      onSelect={() => {
                                        field.onChange(v.id)
                                        setVehicleSearch('')
                                        setVehicleOpen(false)
                                      }}
                                    >
                                      <Check className={`mr-2 h-4 w-4 shrink-0 ${field.value === v.id ? 'opacity-100 text-emerald-600' : 'opacity-0'}`} />
                                      <span className="font-mono font-bold text-[#0A2342] mr-2">{v.placa}</span>
                                      <span className="text-slate-500 text-sm">{v.marca} {v.modelo} • {v.color}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                <FormField
                  control={form.control}
                  name="fecha_vencimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Fecha de Caducidad del Permiso</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-12 rounded-xl bg-slate-50 block w-full uppercase" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full bg-[#0A2342] hover:bg-[#0A2342]/90 h-14 rounded-xl text-md font-bold mt-6 shadow-lg" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Generar y Firmar Permiso (QR)
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4 items-end">

          <div className="space-y-1.5 w-full sm:w-64 relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Buscar Certificado</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <Input
                placeholder="Nº permiso, placa o chofer..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="h-11 pl-9 rounded-xl bg-slate-100/80 border-none font-semibold text-slate-700 placeholder:font-normal focus-visible:ring-2 focus-visible:ring-[#0A2342]/20"
              />
            </div>
          </div>

          <div className="w-full sm:w-48 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Estado Operativo</label>
            <Select value={estadoFilter} onValueChange={(val: any) => { setEstadoFilter(val); setPage(1); }}>
              <SelectTrigger className="w-full h-11 bg-slate-100/80 border-none rounded-xl focus:ring-2 focus:ring-[#0A2342]/20 font-semibold text-slate-700">
                <SelectValue placeholder="Filtrar por Estado" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-lg">
                <SelectItem value="todos" className="font-medium">Todos los permisos</SelectItem>
                <SelectItem value="vigente" className="font-medium text-emerald-600">Vigentes (Aprobados)</SelectItem>
                <SelectItem value="vencido" className="font-medium text-red-600">Vencidos / Revocados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 mb-0.5">
            <Button variant="ghost" className="h-11 w-11 p-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">
              <Filter className="h-5 w-5" />
            </Button>
            <Button variant="ghost" onClick={loadPermits} className="h-11 w-11 p-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600" disabled={loading}>
              <RotateCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {}
      <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-slate-100/80">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[10px] font-extrabold text-slate-400 tracking-wider py-5 px-6">Nº PERMISO / TUC</TableHead>
                  <TableHead className="text-[10px] font-extrabold text-slate-400 tracking-wider py-5">INFORMACIÓN VEHICULAR</TableHead>
                  <TableHead className="text-[10px] font-extrabold text-slate-400 tracking-wider py-5">TITULAR / RESPONSABLE</TableHead>
                  <TableHead className="text-[10px] font-extrabold text-slate-400 tracking-wider py-5">VIGENCIA</TableHead>
                  <TableHead className="text-[10px] font-extrabold text-slate-400 tracking-wider py-5">ALERTA</TableHead>
                  <TableHead className="text-[10px] font-extrabold text-slate-400 tracking-wider py-5">ESTADO</TableHead>
                  <TableHead className="text-[10px] font-extrabold text-slate-400 tracking-wider py-5 text-right pr-6">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permits.map((permit) => (
                  <TableRow key={permit.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">

                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <span className="font-mono text-sm font-extrabold text-[#0A2342] tracking-wider">{permit.numero_permiso}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 text-sm tracking-widest bg-yellow-100 inline-block px-2 py-0.5 rounded border border-yellow-200 shadow-sm w-fit mb-1">{permit.placa}</span>
                        <span className="text-[11px] font-semibold text-slate-500">Unidad autorizada MTC</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div>
                        <p className="font-bold text-slate-900 text-sm tracking-tight">{permit.nombre_completo || 'Sin Conductor'}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          Empresa: {permit.empresa || 'Independiente'}
                        </p>
                        <p className="text-[9px] font-extrabold uppercase text-slate-400 mt-1 tracking-widest">
                          TIPO: {permit.tipo_permiso?.replace('_', ' ')}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">
                          {new Date(permit.fecha_vencimiento).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <DocBadge label="Permiso" fecha={permit.fecha_vencimiento} />                    
                    </TableCell>

                    <TableCell className="py-4">
                      {permit.estado === 'vigente' ? (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 gap-1.5 border border-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-extrabold tracking-wide uppercase">Vigente</span>
                        </div>
                      ) : permit.estado === 'vencido' ? (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-red-50 text-red-600 gap-1.5 border border-red-100">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-extrabold tracking-wide uppercase">Vencido</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 gap-1.5 border border-amber-100">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-extrabold tracking-wide uppercase">{permit.estado}</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-4 pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          onClick={() => viewPermitDetail(permit)}
                          title="Ver Carnet Virtual (QR)"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(permit.estado === 'vencido' || permit.estado === 'renovado') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            onClick={() => renewPermit(permit)}
                            title="Renovar Permiso"
                            disabled={loading}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                          onClick={() => openCarnetPrint(permit)}
                          title="Imprimir Carnet Físico"
                          disabled={loading}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {permits.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No se encontraron permisos emitidos con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {}
          <div className="border-t border-slate-100 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-xs font-semibold text-slate-500">
              Página {page} de {totalPages || 1} — Total histórico: {totalRecords || permits.length} registros
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 data-[disabled]:opacity-50"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 data-[disabled]:opacity-50"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Dialog open={showPermitDetail} onOpenChange={setShowPermitDetail}>
        <DialogContent className="w-[95vw] sm:max-w-md p-0 overflow-hidden rounded-3xl bg-transparent border-none shadow-2xl" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Tarjeta Única de Circulación: {selectedPermit?.numero_permiso}</DialogTitle>
          {selectedPermit && (
            <div className="bg-[#0A2342] text-white flex flex-col items-center p-8 relative overflow-hidden">
              {}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 rounded-full mix-blend-screen opacity-20 blur-xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500 rounded-full mix-blend-screen opacity-10 blur-xl"></div>

              <img src="/Marcona_Escudo.png" alt="Escudo Marcona" className="opacity-90 w-16 h-16 object-contain drop-shadow-sm mb-4 relative z-10" />
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 mb-1 relative z-10">Municipalidad de Marcona</h3>
              <h2 className="text-xl font-extrabold tracking-tight mb-6 relative z-10 text-center leading-tight">Tarjeta Única de<br />Circulación Electrónica</h2>

              {}
              <div className="bg-white text-slate-900 w-full rounded-2xl p-6 relative z-10 shadow-xl overflow-hidden flex flex-col items-center">

                {}
                <div className={`absolute top-0 left-0 w-full py-1.5 text-center text-[9px] font-extrabold tracking-widest uppercase ${selectedPermit.estado === 'vigente' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {selectedPermit.estado}
                </div>

                {selectedPermit.qr_code && selectedPermit.qr_code !== 'FAKE_QR' ? (
                  <div className="w-40 h-40 bg-white p-2 rounded-xl border-4 border-slate-100 shadow-sm mt-4 mb-4">
                    <img src={`data:image/png;base64,${selectedPermit.qr_code}`} alt="QR Code Oficial" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-slate-100 p-2 rounded-xl border border-slate-200 mt-4 mb-4 flex items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12 opacity-50" />
                  </div>
                )}

                <span className="font-mono text-sm font-extrabold text-slate-800 tracking-[0.2em] mb-4">
                  {selectedPermit.numero_permiso}
                </span>

                <div className="w-full space-y-3 mt-2 text-left">
                  <div className="flex flex-col border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidad Vehicular</span>
                    <p className="font-extrabold text-[#0A2342] text-sm uppercase">Placa: {selectedPermit.placa}</p>
                    <p className="font-semibold text-slate-600 text-xs">{selectedPermit.marca} {selectedPermit.modelo}</p>
                  </div>
                  <div className="flex flex-col border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Empresa / Operador</span>
                    <p className="font-extrabold text-[#0A2342] text-sm">{selectedPermit.empresa || 'Independiente'}</p>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Titular</span>
                    <span className="text-xs font-extrabold text-[#0A2342] text-right truncate max-w-[150px] uppercase">{selectedPermit.nombre_completo || 'No asignado'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Servicio</span>
                    <span className="text-xs font-extrabold text-[#0A2342] capitalize">{selectedPermit.tipo_permiso?.replace('_', ' ') || 'Libre Tránsito'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Válido Hasta</span>
                    <span className="text-xs font-extrabold text-[#0A2342]">
                      {new Date(selectedPermit.fecha_vencimiento).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => downloadPermitPDF(selectedPermit)}
                className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white border-none rounded-xl h-12"
              >
                <Download className="mr-2 h-4 w-4" /> Exportar TUC para Imprimir
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Carnet imprimible doble cara ── */}
      <Dialog open={showCarnetPrint} onOpenChange={setShowCarnetPrint}>
        <DialogContent
          className="w-[95vw] max-w-4xl p-6 rounded-3xl bg-slate-50 overflow-y-auto max-h-[95vh] print:p-0 print:max-w-none print:w-full print:h-auto print:max-h-none print:bg-white"
          aria-describedby={undefined}
        >
          <DialogHeader className="print:hidden">
            <DialogTitle className="text-xl font-extrabold text-[#0A2342] flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Carnet de Conductor — Doble Cara
            </DialogTitle>
            <p className="text-sm text-slate-500">
              Ambas caras se imprimirán en una sola hoja. Usa la impresora y selecciona
              <strong> «Doble cara»</strong> o imprime primero la cara delantera y luego la trasera.
            </p>
          </DialogHeader>
          {selectedCarnetPermit && (
            <PermisoCarnet permit={selectedCarnetPermit} />
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
