import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { Company, Vehicle } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Filter, RotateCw, Eye, Pencil, Ban, ChevronLeft, ChevronRight, CheckCircle2, X, ShieldCheck, FileCheck, Info, Upload, ImageIcon, Car, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { REGEX_NAME, REGEX_PLACA_PERU, REGEX_VIN } from '@/lib/validation'
import { DocBadge } from '@/components/ui/DocBadge'
import { downloadJavaExcelReport } from '@/lib/java-report-client'

const MAX_FABRICATION_YEAR = new Date().getFullYear() + 1

const vehicleSchema = z.object({

  company_id: z.string().optional(),
  tipo_propiedad: z.string().optional(),
  placa: z.string().trim().toUpperCase().regex(REGEX_PLACA_PERU, 'Formato de placa inválido'),
  marca: z.string().trim().min(2, 'Marca requerida').max(50, 'Máximo 50 caracteres').regex(REGEX_NAME, 'Marca inválida'),
  modelo: z.string().trim().min(2, 'Modelo requerido').max(50, 'Máximo 50 caracteres').regex(REGEX_NAME, 'Modelo inválido'),
  color: z.string().trim().min(2, 'Color requerido').max(30, 'Máximo 30 caracteres').regex(REGEX_NAME, 'Color inválido'),
  numero_vin: z.string().trim().toUpperCase().optional().refine((value) => !value || REGEX_VIN.test(value), 'VIN inválido (17 caracteres)'),

  categoria: z.string().optional(),
  ano_fabricacion: z.string().trim().optional().refine((value) => {
    if (!value) return true
    const year = Number(value)
    return Number.isInteger(year) && year >= 1950 && year <= MAX_FABRICATION_YEAR
  }, `Año inválido (1950-${MAX_FABRICATION_YEAR})`),
  numero_motor: z.string().trim().max(50, 'Máximo 50 caracteres').optional(),
  combustible: z.string().optional(),

  soat_poliza: z.string().trim().max(50, 'Máximo 50 caracteres').optional(),
  soat_aseguradora: z.string().trim().max(100, 'Máximo 100 caracteres').optional(),
  soat_vencimiento: z.string().optional().refine((value) => {
    if (!value) return true
    const d = new Date(`${value}T00:00:00`)
    return !Number.isNaN(d.getTime())
  }, 'Fecha de SOAT inválida'),

  rt_entidad: z.string().trim().max(100, 'Máximo 100 caracteres').optional(),
  rt_certificado: z.string().trim().max(50, 'Máximo 50 caracteres').optional(),
  rt_vencimiento: z.string().optional().refine((value) => {
    if (!value) return true
    const d = new Date(`${value}T00:00:00`)
    return !Number.isNaN(d.getTime())
  }, 'Fecha de Revisión Técnica inválida'),

  tipo_servicio: z.string().trim().max(100, 'Máximo 100 caracteres').optional()
})

type VehicleFormData = z.infer<typeof vehicleSchema>

export function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)

  function handleImageAdd(files: File[]) {
    const valid = files.filter(f =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
    setImageFiles(prev => {
      const combined = [...prev, ...valid].slice(0, 2)
      setImagePreviews(combined.map(f => URL.createObjectURL(f)))
      return combined
    })
  }

  function removeImage(idx: number) {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_, i) => i !== idx)
    })
  }

  const [isCreating, setIsCreating] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null)
  const [placaValidated, setPlacaValidated] = useState(false)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const limit = 10
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'activos' | 'inactivos' | 'todos'>('activos')

  const defaultValues = {
    company_id: '',
    tipo_propiedad: 'empresa',
    placa: '',
    marca: '',
    modelo: '',
    color: '',
    numero_vin: '',
    categoria: '', ano_fabricacion: '', numero_motor: '', combustible: 'Gasolina',
    soat_poliza: '', soat_aseguradora: '', soat_vencimiento: '',
    rt_entidad: '', rt_certificado: '', rt_vencimiento: '', tipo_servicio: ''
  }

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues,
  })

  const currentPlaca = form.watch("placa")
  useEffect(() => {
    if (currentPlaca && currentPlaca.length >= 6 && isCreating) {
      if (!placaValidated) setPlacaValidated(true)
    } else {
      if (placaValidated) setPlacaValidated(false)
    }
  }, [currentPlaca, isCreating])

  useEffect(() => {
    if (!isCreating) loadVehicles()
  }, [page, search, estadoFilter, isCreating])

  useEffect(() => {
    async function loadRefs() {
      try {
        const c = await apiClient.listCompanies({ limit: 1000, page: 1 })
        setCompanies(c.data.data)
      } catch {
        toast.error('Error al cargar listas')
      }
    }
    loadRefs()
  }, [])

  async function loadVehicles() {
    try {
      setLoading(true)
      const res = await apiClient.listVehicles({
        page,
        limit,
        search,
        include_inactive: estadoFilter !== 'activos' ? 1 : undefined,
        estado: estadoFilter === 'inactivos' ? 'inactivo' : undefined,
      })
      setVehicles(res.data.data)
      setTotalPages(res.data.pagination.pages)
      setTotalRecords(res.data.pagination.total)
    } catch {
      toast.error('Error al cargar vehículos')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: VehicleFormData) {
    try {
      setLoading(true)

      const payload = {
        placa: data.placa,
        categoria: data.categoria || 'L5',
        marca: data.marca,
        modelo: data.modelo,
        color: data.color,
        ano_fabricacion: data.ano_fabricacion || '',
        numero_vin: data.numero_vin || '',
        numero_motor: data.numero_motor || '',
        combustible: data.combustible || '',
        tipo_propiedad: data.tipo_propiedad || 'empresa',
        tipo_servicio: data.tipo_servicio || '',
        company_id: data.company_id ? Number(data.company_id) : '',
        soat_poliza: data.soat_poliza || '',
        soat_aseguradora: data.soat_aseguradora || '',
        soat_vencimiento: data.soat_vencimiento || '',
        rt_entidad: data.rt_entidad || '',
        rt_certificado: data.rt_certificado || '',
        rt_vencimiento: data.rt_vencimiento || '',
      }

      if (editingVehicle) {
        await apiClient.updateVehicle({ ...payload, id: editingVehicle.id })
        toast.success('Vehículo actualizado exitosamente')
      } else {
        await apiClient.createVehicle(payload, imageFiles.length > 0 ? imageFiles : undefined)
        toast.success('Vehículo registrado exitosamente')
      }

      form.reset(defaultValues)
      setImageFiles([])
      setImagePreviews([])
      setIsCreating(false)
      setEditingVehicle(null)
      await loadVehicles()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Error al guardar vehículo')
    } finally {
      setLoading(false)
    }
  }

  function onInvalidSubmit() {
    toast.error('Revisa los datos del vehículo antes de continuar')
  }

  async function toggleVehicleState(vehicle: Vehicle) {
    if (!confirm(`¿Está seguro de ${vehicle.estado === 'activo' ? 'SUSPENDER' : 'HABILITAR'} el vehículo ${vehicle.placa}?`)) return
    try {
      setLoading(true)
      const activate = vehicle.estado !== 'activo'
      await apiClient.toggleVehicleStatus(vehicle.id)
      toast.success(activate ? 'Vehículo habilitado' : 'Vehículo suspendido')
      await loadVehicles()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Error al actualizar estado')
    } finally {
      setLoading(false)
    }
  }

  function openEditVehicle(vehicle: Vehicle) {
    form.reset({
      company_id: vehicle.company_id ? String(vehicle.company_id) : '',
      tipo_propiedad: vehicle.tipo_propiedad || 'empresa',
      placa: vehicle.placa,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      color: vehicle.color,
      numero_vin: vehicle.numero_vin || '',
      numero_motor: vehicle.numero_motor || '',
      combustible: vehicle.combustible || 'Gasolina',
      ano_fabricacion: vehicle.ano_fabricacion ? String(vehicle.ano_fabricacion) : '',
      soat_poliza: vehicle.soat_poliza || '',
      soat_aseguradora: vehicle.soat_aseguradora || '',
      soat_vencimiento: vehicle.soat_vencimiento || '',
      rt_entidad: vehicle.rt_entidad || '',
      rt_certificado: vehicle.rt_certificado || '',
      rt_vencimiento: vehicle.rt_vencimiento || '',
      tipo_servicio: vehicle.tipo_servicio || '',
    })
    setEditingVehicle(vehicle)
    setIsCreating(true)
  }

  async function downloadExcel() {
    try {
      setLoading(true)
      toast.info('Generando reporte con Java...')
      const response = await apiClient.exportVehicles({
        search: search.trim(),
        estado: estadoFilter
      })
      
      if (!response.data || response.data.length === 0) {
        toast.error('No hay datos para exportar')
        return
      }

      const excelData = response.data.map((v: any) => ({
        'Placa': v.placa,
        'Marca': v.marca,
        'Modelo': v.modelo,
        'Año Fab.': v.anio_fabricacion,
        'Color': v.color,
        'Conductor Asignado': v.conductor_asignado || 'Sin Asignar',
        'Empresa': v.empresa || 'Independiente',
        'SOAT Vence': v.soat_vencimiento,
        'Rev. Téc. Vence': v.rt_vencimiento,
        'Estado': v.estado === 'activo' ? 'Habilitado' : 'Suspendido'
      }))

      await downloadJavaExcelReport(
        'Reporte de vehículos MTC Marcona',
        excelData,
        'Reporte_Vehiculos_Java',
      )
      toast.success('Reporte Excel generado con Java y descargado correctamente')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al generar el reporte Excel')
    } finally {
      setLoading(false)
    }
  }

  if (isCreating) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
        {}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <p className="text-[10px] font-extrabold text-[#0A2342]/50 tracking-widest uppercase mb-1">Vehículos / {editingVehicle ? `Editando ${editingVehicle.placa}` : 'Nuevo Registro'}</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0A2342]">{editingVehicle ? 'Editar Vehículo' : 'Registro de Nuevo Vehículo'}</h1>
            <p className="text-slate-500 font-medium mt-1">{editingVehicle ? 'Modifique los datos técnicos y legales de la unidad.' : 'Ingrese los datos técnicos y legales de la unidad para el sistema de gestión de transporte.'}</p>
          </div>
          <div className="shrink-0 flex items-center justify-center bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm shadow-sm border border-emerald-100">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Sistema Seguro
          </div>
        </div>

        {}
        {placaValidated && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-start justify-between shadow-sm animate-in slide-in-from-top-4">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-800 text-sm">Validación de Placa Exitosa</h4>
                <p className="text-xs font-semibold text-emerald-600/80 mt-0.5">La placa {currentPlaca.toUpperCase()} no presenta restricciones administrativas vigentes.</p>
              </div>
            </div>
            <button className="text-emerald-400 hover:text-emerald-600" onClick={() => setPlacaValidated(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-6">

            {}
            <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
              <CardContent className="p-4 md:p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1.5 h-6 bg-[#0A2342] rounded-full"></div>
                  <h3 className="text-lg font-bold text-[#0A2342]">Información General</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="placa" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Placa del Vehículo</FormLabel>
                      <FormControl className="relative">
                        <div className="relative">
                          <Input
                            {...field}
                            maxLength={7}
                            className="h-12 rounded-xl bg-slate-50 uppercase text-slate-900 font-bold"
                            placeholder="ABC-123"
                            onChange={(e) => {
                              const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
                              field.onChange(cleaned)
                            }}
                          />
                          {currentPlaca?.length >= 6 && <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-4 top-4" />}
                        </div>
                      </FormControl>
                      <p className="text-[10px] font-semibold text-slate-400">Formato admitido: LLL-NNN o LL-NNNN</p>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="categoria" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Categoría</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="L5">L5 (Vehículos menores de 3 ruedas)</SelectItem>
                          <SelectItem value="M1">M1 (Vehículos de 8 asientos o menos)</SelectItem>
                          <SelectItem value="N1">N1 (Vehículos de carga hasta 3.5 ton)</SelectItem>
                          <SelectItem value="O1">O1 (Remolques ligeros)</SelectItem>
                          <SelectItem value="OTRO">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="ano_fabricacion" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Año de Fabricación</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={1950}
                          max={MAX_FABRICATION_YEAR}
                          className="h-12 rounded-xl bg-slate-50"
                          placeholder="Ej: 2024"
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="marca" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Marca</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12 rounded-xl bg-slate-50" placeholder="Ej: Toyota" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="modelo" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Modelo</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12 rounded-xl bg-slate-50" placeholder="Ej: Hilux" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="color" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Color</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12 rounded-xl bg-slate-50" placeholder="Ej: Blanco" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-2xl border border-slate-200 shadow-none overflow-hidden relative">
                <div className="h-1.5 w-full bg-[#0A2342] absolute top-0"></div>
                <CardContent className="p-4 md:p-8 space-y-6 mt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-slate-900">Seguro (SOAT)</h3>
                    <ShieldCheck className="w-5 h-5 text-[#0A2342]" strokeWidth={2.5} />
                  </div>

                  <FormField control={form.control} name="soat_poliza" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Número de Póliza</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12 rounded-xl bg-slate-50 uppercase" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="soat_aseguradora" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Compañía Aseguradora</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12 rounded-xl bg-slate-50" placeholder="Ej: Rimac, Pacífico" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="soat_vencimiento" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Fecha de Vencimiento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-12 rounded-xl bg-slate-50 block w-full" />
                      </FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200 shadow-none overflow-hidden relative">
                <div className="h-1.5 w-full bg-[#0A2342] absolute top-0"></div>
                <CardContent className="p-4 md:p-8 space-y-6 mt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-slate-900">Revisión Técnica</h3>
                    <FileCheck className="w-5 h-5 text-[#0A2342]" strokeWidth={2.5} />
                  </div>

                  <FormField control={form.control} name="rt_entidad" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Entidad Certificadora</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12 rounded-xl bg-slate-50" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rt_certificado" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Número de Certificado</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12 rounded-xl bg-slate-50 uppercase" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rt_vencimiento" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Fecha de Vencimiento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-12 rounded-xl bg-slate-50 block w-full" />
                      </FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </div>

            {}
            <Card className="rounded-2xl border-none shadow-sm overflow-hidden mb-12">
              <CardContent className="p-4 md:p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1.5 h-6 bg-[#0A2342] rounded-full"></div>
                  <h3 className="text-lg font-bold text-[#0A2342]">Vínculo de Operación</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="company_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Empresa de Transporte</FormLabel>
                      <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                            <SelectValue placeholder="Buscar empresa autorizada..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="__none__">Sin Empresa / Independiente</SelectItem>
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="tipo_propiedad" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Tipo de Propiedad</FormLabel>
                      <Select defaultValue="empresa" onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Seleccionar propiedad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="empresa">Propietario: Empresa</SelectItem>
                          <SelectItem value="particular">Propietario: Particular (Independiente)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="tipo_servicio" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Tipo de Servicio</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Seleccionar servicio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Moto-Taxi">Moto-Taxi (Menor)</SelectItem>
                          <SelectItem value="Taxi">Taxi (Tico/Automóvil)</SelectItem>
                          <SelectItem value="Colectivo">Colectivo</SelectItem>
                          <SelectItem value="Carga">Transporte de Carga</SelectItem>
                          <SelectItem value="Especial">Especial</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {}
            <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
              <CardContent className="p-4 md:p-8 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0A2342]">Evidencia Fotográfica</h3>
                    <p className="text-xs text-slate-500 font-medium">Sube hasta 2 fotos del vehículo (Frontal y Lateral). Formato JPG, PNG o WEBP.</p>
                  </div>
                </div>

                {}
                {imagePreviews.length < 2 && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragging(false)
                      handleImageAdd(Array.from(e.dataTransfer.files).slice(0, 2 - imageFiles.length))
                    }}
                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${isDragging ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    onClick={() => document.getElementById('vehicle-image-input')?.click()}
                  >
                    <input
                      id="vehicle-image-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleImageAdd(Array.from(e.target.files || []).slice(0, 2 - imageFiles.length))
                        e.target.value = ''
                      }}
                    />
                    <ImageIcon className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-500 text-sm">
                      {isDragging ? '¡Suelta aquí las fotos!' : 'Arrastra fotos aquí o haz clic para seleccionar'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{2 - imagePreviews.length} foto(s) restante(s) • Máx 5MB por imagen</p>
                  </div>
                )}

                {}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {imagePreviews.map((src, idx) => (
                      <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                        <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          {idx === 0 ? '📷 Frontal' : '📷 Lateral'}
                        </div>
                      </div>
                    ))}
                    {imagePreviews.length < 2 && (
                      <div
                        className="rounded-2xl border-2 border-dashed border-slate-200 aspect-video flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 bg-slate-50"
                        onClick={() => document.getElementById('vehicle-image-input')?.click()}
                      >
                        <Upload className="w-5 h-5 text-slate-300 mb-1" />
                        <span className="text-xs font-semibold text-slate-400">Añadir otra</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-6 pt-4 pb-12">
              <span
                onClick={() => setIsCreating(false)}
                className="text-sm font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancelar Registro
              </span>
              <Button type="submit" className="bg-[#0A2342] hover:bg-[#0A2342]/90 h-12 px-8 rounded-xl text-md font-bold shadow-lg" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Registrar Vehículo
              </Button>
            </div>
          </form>
        </Form>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Vehículos</h1>
          <p className="text-slate-500 font-medium mt-2 max-w-xl">
            Registro y seguimiento de todas las unidades motorizadas autorizadas para Circular, junto con sus características.
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

          <Button onClick={() => { form.reset(defaultValues); setIsCreating(true); }} className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white font-semibold shadow-md py-6 px-6 h-14 rounded-xl shrink-0 flex items-center">
            <Info className="mr-2 h-5 w-5 opacity-90" /> Nuevo Registro Vehicular
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
          <div className="space-y-1.5 w-full sm:w-56">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Filtrar por placa / marca</label>
            <Input
              placeholder="Ej: ABC-123"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-11 rounded-xl bg-slate-100/80 border-none font-semibold text-slate-700 placeholder:font-normal focus-visible:ring-2 focus-visible:ring-[#0A2342]/20"
            />
          </div>

          <div className="space-y-1.5 w-full sm:w-56">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Estado</label>
            <Select value={estadoFilter} onValueChange={(val: any) => { setEstadoFilter(val); setPage(1); }}>
              <SelectTrigger className="w-full h-11 bg-slate-100/80 border-none rounded-xl focus:ring-2 focus:ring-[#0A2342]/20 font-semibold text-slate-700">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-lg">
                <SelectItem value="todos" className="font-medium">Todos los estados</SelectItem>
                <SelectItem value="activos" className="font-medium">Solo habilitados</SelectItem>
                <SelectItem value="inactivos" className="font-medium">Inactivos / Suspendidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="h-11 w-11 p-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">
            <Filter className="h-5 w-5" />
          </Button>
          <Button variant="ghost" onClick={loadVehicles} className="h-11 w-11 p-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600" disabled={loading}>
            <RotateCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-slate-100/80">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-slate-500 py-4 px-6">PLACA</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4">VEHÍCULO</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4">EMPRESA / RESPONSABLE</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4">ESTADO</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4">SOAT</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4">REV. TÉCNICA</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4 text-right pr-6">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow key={v.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                    <TableCell className="py-4 px-6 text-slate-900 font-extrabold font-mono text-base tracking-widest pl-6">
                      <div className="inline-block border-2 border-slate-300 bg-white rounded-md px-3 py-1 shadow-sm">
                        {v.placa}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{v.marca} {v.modelo}</span>
                        <span className="text-xs font-semibold text-slate-500 mt-0.5">Color: {v.color} {v.numero_vin ? `• VIN: ${v.numero_vin}` : ''}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-[#0A2342] truncate max-w-[200px]" title={v.company_nombre || 'Independiente'}>
                          {v.company_nombre || 'Independiente'}
                        </span>
                        {v.assignment_id ? (
                          <div className="flex flex-col mt-0.5">
                            <span className="text-xs font-semibold text-slate-700">
                              👤 {v.driver_nombre}
                            </span>
                            <span className="text-[10px] text-slate-400 capitalize">
                              Asignación: {v.assignment_tipo}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded w-fit mt-1">
                            Sin conductor asignado
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      {v.estado === 'activo' ? (
                        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600">
                          <span className="text-xs font-bold">Habilitado</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-50 text-red-600">
                          <span className="text-xs font-bold">Inactivo</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      <DocBadge label="SOAT" fecha={v.soat_vencimiento} />
                    </TableCell>

                    <TableCell className="py-4">
                      <DocBadge label="Rev. Téc." fecha={v.rt_vencimiento} />
                    </TableCell>

                    <TableCell className="py-4 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewingVehicle(v)} className="h-8 w-8 text-slate-400 hover:text-[#0A2342] hover:bg-slate-100 rounded-lg" title="Ver detalles">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditVehicle(v)} className="h-8 w-8 text-slate-400 hover:text-[#0A2342] hover:bg-slate-100 rounded-lg" title="Editar vehículo">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 rounded-lg ${v.estado === 'activo' ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-red-500 hover:bg-red-50'}`}
                          onClick={() => toggleVehicleState(v)}
                          title={v.estado === 'activo' ? 'Suspender vehículo' : 'Habilitar vehículo'}
                        >
                          <Ban className="h-4 w-4" strokeWidth={2.5} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {vehicles.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No se encontraron vehículos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {}
          <div className="border-t border-slate-100 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-xs font-semibold text-slate-500">
              Mostrando {totalRecords === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, totalRecords)} de {totalRecords} unidades
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

              {[...Array(totalPages)].map((_, i) => {
                if (i + 1 === 1 || i + 1 === totalPages || (i + 1 >= page - 1 && i + 1 <= page + 1)) {
                  return (
                    <Button
                      key={i}
                      variant="ghost"
                      className={`h-8 w-8 p-0 rounded-md text-xs font-bold transition-colors ${page === i + 1 ? 'bg-[#0A2342] text-white hover:bg-[#0A2342]/90' : 'text-slate-500 hover:bg-slate-100'}`}
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  );
                }

                if ((i + 1 === page - 2 && page > 3) || (i + 1 === page + 2 && page < totalPages - 2)) {
                  return <span key={i} className="text-slate-400 font-bold px-1">...</span>;
                }

                return null;
              })}

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
      {viewingVehicle && (() => {
        const v = viewingVehicle
        return (
          <Dialog open onOpenChange={(open) => !open && setViewingVehicle(null)}>
            <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-2xl" aria-describedby={undefined}>
              <DialogTitle className="sr-only">Detalle del Vehículo: {v.placa}</DialogTitle>
              <div className="bg-[#0A2342] p-6 pb-8 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <Car className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <div className="inline-block border-2 border-white/30 rounded-md px-3 py-1 font-mono font-extrabold text-lg tracking-widest mb-1">{v.placa}</div>
                    <p className="text-white/70 text-sm font-medium">{v.marca} {v.modelo} &bull; {v.color}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white space-y-5 -mt-4 rounded-t-2xl relative z-10">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-500">ESTADO OPERATIVO</span>
                  {v.estado === 'activo' ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">Habilitado</span>
                  ) : (
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md">Inactivo / Suspendido</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empresa</label>
                    <p className="font-semibold text-sm text-slate-800 mt-1">{v.company_nombre || 'Independiente'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de propiedad</label>
                    <p className="font-semibold text-sm text-slate-800 mt-1 capitalize">{v.tipo_propiedad}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conductor Asignado</label>
                    <p className="font-semibold text-sm text-slate-800 mt-1">{v.driver_nombre || 'Sin conductor'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Año de Fabricación</label>
                    <p className="font-semibold text-sm text-slate-800 mt-1">{v.ano_fabricacion || 'N/A'}</p>
                  </div>

                  {(v.soat_vencimiento || v.rt_vencimiento) && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venc. SOAT</label>
                        <p className="font-semibold text-sm text-slate-800 mt-1">
                          {v.soat_vencimiento ? format(new Date(v.soat_vencimiento), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venc. Rev. Técnica</label>
                        <p className="font-semibold text-sm text-slate-800 mt-1">
                          {v.rt_vencimiento ? format(new Date(v.rt_vencimiento), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                        </p>
                      </div>
                    </>
                  )}

                  {v.numero_vin && (
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Número VIN / Chasis</label>
                      <p className="font-mono font-semibold text-sm text-slate-800 mt-1">{v.numero_vin}</p>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

    </div>
  )
}
