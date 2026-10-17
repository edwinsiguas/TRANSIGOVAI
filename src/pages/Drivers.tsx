import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { Company, Driver } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { UserPlus, Loader2, Filter, RotateCw, Eye, Pencil, Ban, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { REGEX_DNI, REGEX_LICENSE, REGEX_NAME, REGEX_PHONE } from '@/lib/validation'
import { DocBadge } from '@/components/ui/DocBadge'
import { downloadJavaExcelReport } from '@/lib/java-report-client'

const driverSchema = z.object({
  company_id: z.string().optional(),
  nombre_completo: z.string().trim().min(3, 'Mínimo 3 caracteres').max(150, 'Máximo 150 caracteres').regex(REGEX_NAME, 'Nombre inválido'),
  dni: z.string().trim().regex(REGEX_DNI, 'DNI de 8 dígitos'),
  telefono: z.string().trim().regex(REGEX_PHONE, 'Teléfono inválido'),
  numero_licencia: z.string().trim().regex(REGEX_LICENSE, 'Número de licencia inválido'),
  fecha_vencimiento_licencia: z.string().min(1, 'Fecha requerida').refine((value) => {
    const d = new Date(`${value}T00:00:00`)
    return !Number.isNaN(d.getTime())
  }, 'Fecha de licencia inválida'),
})

type DriverFormData = z.infer<typeof driverSchema>

export function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const limit = 10

  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const [empresaFilter, setEmpresaFilter] = useState<'todas' | string>('todas')

  const defaultValues = {
    company_id: '',
    nombre_completo: '',
    dni: '',
    telefono: '',
    numero_licencia: '',
    fecha_vencimiento_licencia: '',
  }

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues,
  })

  useEffect(() => {
    loadDrivers()
  }, [page, estadoFilter, empresaFilter])

  useEffect(() => {
    async function loadRefs() {
      try {
        const c = await apiClient.listCompanies({ limit: 200, page: 1 })
        setCompanies(c.data.data)
      } catch {
        toast.error('Error al cargar listas de empresas')
      }
    }
    loadRefs()
  }, [])

  async function loadDrivers() {
    try {
      setLoading(true)
      const res = await apiClient.listDrivers({
        page,
        limit,
        search: '',
        include_inactive: estadoFilter !== 'activos' ? 1 : undefined,
        estado: estadoFilter === 'inactivos' ? 'inactivo' : undefined,
        company_id: empresaFilter !== 'todas' ? Number(empresaFilter) : undefined,
      })
      setDrivers(res.data.data)
      setTotalPages(res.data.pagination.pages)
      setTotalRecords(res.data.pagination.total)
    } catch {
      toast.error('Error al cargar choferes')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: DriverFormData) {
    try {
      setLoading(true)
      if (editingId) {
        await apiClient.updateDriver({
          ...data,
          id: editingId,
          company_id: data.company_id ? Number(data.company_id) : undefined,
        })
        toast.success('Chofer actualizado exitosamente')
      } else {
        await apiClient.createDriver({
          ...data,
          company_id: data.company_id ? Number(data.company_id) : undefined,
        })
        toast.success('Chofer registrado exitosamente')
      }
      form.reset(defaultValues)
      setEditingId(null)
      setOpen(false)
      await loadDrivers()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Error al guardar chofer')
    } finally {
      setLoading(false)
    }
  }

  function openEditDialog(driver: Driver) {
    form.reset({
      company_id: driver.company_id ? String(driver.company_id) : '',
      nombre_completo: driver.nombre_completo,
      dni: driver.dni,
      telefono: driver.telefono || '',
      numero_licencia: driver.numero_licencia || '',
      fecha_vencimiento_licencia: driver.fecha_vencimiento_licencia || '',
    })
    setEditingId(driver.id)
    setOpen(true)
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      setEditingId(null)
      form.reset(defaultValues)
    }
  }

  function onInvalidSubmit() {
    toast.error('Revisa los datos del conductor antes de continuar')
  }

  async function toggleDriverState(driver: Driver) {
    try {
      setLoading(true)
      const activate = driver.estado !== 'activo'
      await apiClient.updateDriver({
        id: driver.id,
        estado: activate ? 'activo' : 'inactivo',
      })
      toast.success(activate ? 'Chofer habilitado' : 'Chofer suspendido')
      await loadDrivers()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Error al actualizar estado')
    } finally {
      setLoading(false)
    }
  }

  function getInitials(name: string) {
    if (!name) return 'CH'
    const parts = name.split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  async function downloadExcel() {
    try {
      setLoading(true)
      toast.info('Generando reporte con Java...')
      const response = await apiClient.exportDrivers({
        empresa: empresaFilter,
        estado: estadoFilter
      })
      
      if (!response.data || response.data.length === 0) {
        toast.error('No hay datos para exportar')
        return
      }

      const excelData = response.data.map((d: any) => ({
        'DNI': d.dni,
        'Nombre Completo': d.nombre_completo,
        'Teléfono': d.telefono,
        'Nº Licencia': d.numero_licencia,
        'Licencia Vence': d.fecha_vencimiento_licencia,
        'Vehículo Asignado': d.vehiculo_asignado || 'Ninguno',
        'Empresa': d.empresa || 'Independiente',
        'Estado': d.estado === 'activo' ? 'Habilitado' : 'Suspendido'
      }))

      await downloadJavaExcelReport(
        'Reporte de conductores MTC Marcona',
        excelData,
        'Reporte_Conductores_Java',
      )
      toast.success('Reporte Excel generado con Java y descargado correctamente')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al generar el reporte Excel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

      {}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Gestión de Conductores</h1>
          <p className="text-slate-500 font-medium mt-2 max-w-2xl">
            Panel administrativo para la supervisión, habilitación y control documental de los conductores de transporte público en Marcona.
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

          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); form.reset(defaultValues) }} className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white font-semibold shadow-md py-6 px-6 h-14 rounded-xl shrink-0 flex items-center">
                <UserPlus className="mr-2 h-5 w-5" /> Registrar Nuevo Conductor
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[85vh] overflow-y-auto rounded-2xl" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900">
                {editingId ? 'Editar Conductor' : 'Nuevo Conductor'}
              </DialogTitle>
              <p className="text-sm font-medium text-slate-500 mt-1">
                {editingId ? 'Modifique los datos del conductor.' : 'Ingrese los datos personales y de licencia del conductor.'}
              </p>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-5 mt-4">
                <FormField
                  control={form.control}
                  name="company_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">Empresa (opcional)</FormLabel>
                      <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Seleccionar empresa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="__none__">Independiente (Sin empresa)</SelectItem>
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nombre_completo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">Nombre completo</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12 rounded-xl" placeholder="Ej. Juan Perez" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dni"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-slate-700">DNI</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            maxLength={8}
                            inputMode="numeric"
                            className="h-12 rounded-xl"
                            placeholder="8 dígitos"
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-slate-700">Teléfono</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            maxLength={15}
                            inputMode="numeric"
                            className="h-12 rounded-xl"
                            placeholder="Celular"
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="numero_licencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-slate-700">Nº Licencia</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-12 rounded-xl" placeholder="A-IIb..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fecha_vencimiento_licencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-slate-700">Vencimiento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-12 rounded-xl block w-full" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full bg-[#0A2342] hover:bg-[#0A2342]/90 h-12 rounded-xl text-md font-bold mt-2" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {editingId ? 'Guardar Cambios' : 'Confirmar Registro'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
          <div className="space-y-1.5 w-full sm:w-56">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Filtrar por estado</label>
            <Select value={estadoFilter} onValueChange={(val: any) => { setEstadoFilter(val); setPage(1); }}>
              <SelectTrigger className="w-full h-11 bg-slate-100/80 border-none rounded-xl focus:ring-2 focus:ring-[#0A2342]/20 font-semibold text-slate-700">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-lg">
                <SelectItem value="todos" className="font-medium">Todos los estados</SelectItem>
                <SelectItem value="activos" className="font-medium">Habilitados</SelectItem>
                <SelectItem value="inactivos" className="font-medium">Suspendidos / Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 w-full sm:w-64">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Filtrar por empresa</label>
            <Select value={empresaFilter} onValueChange={(val) => { setEmpresaFilter(val); setPage(1); }}>
              <SelectTrigger className="w-full h-11 bg-slate-100/80 border-none rounded-xl focus:ring-2 focus:ring-[#0A2342]/20 font-semibold text-slate-700">
                {}
                <span className="truncate pr-2">
                  <SelectValue placeholder="Todas las empresas" />
                </span>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-lg max-h-64">
                <SelectItem value="todas" className="font-medium">Todas las empresas</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={String(c.id)} className="font-medium">{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="h-11 w-11 p-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">
            <Filter className="h-5 w-5" />
          </Button>
          <Button variant="ghost" onClick={loadDrivers} className="h-11 w-11 p-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600" disabled={loading}>
            <RotateCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {}
      <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-slate-100/80">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-slate-500 py-4 px-6 w-20">FOTO</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4">NOMBRE</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4">DNI / LICENCIA</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4">EMPRESA</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4">ESTADO</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4">VENCIMIENTO</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4">BREVETE</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 py-4 text-right pr-6">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((d) => (
                  <TableRow key={d.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                    <TableCell className="py-4 px-6">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm font-bold text-xs bg-[#0A2342] text-white flex items-center justify-center">
                        <AvatarFallback className="bg-transparent">{getInitials(d.nombre_completo)}</AvatarFallback>
                      </Avatar>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{d.nombre_completo}</span>
                        <span className="text-xs font-semibold text-slate-400 mt-0.5">ID: #C-{d.id.toString().padStart(4, '0')}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-slate-700">DNI {d.dni}</span>
                        <span className="text-xs font-semibold text-slate-500">Lic. {d.numero_licencia}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4 w-48">
                      <span className="text-sm font-semibold text-slate-700 block truncate" title={d.company_nombre || 'Independiente'}>
                        {d.company_nombre || 'Independiente'}
                      </span>
                    </TableCell>

                    <TableCell className="py-4">
                      {d.estado === 'activo' ? (
                        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600">
                          <span className="text-xs font-bold">Habilitado</span>
                        </div>
                      ) : d.estado === 'suspendido' ? (
                        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-50 text-red-600">
                          <span className="text-xs font-bold">Suspendido</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-orange-50 text-orange-600">
                          <span className="text-xs font-bold">Observado</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      <span className="text-sm font-bold text-slate-700">
                        {d.fecha_vencimiento_licencia ? format(new Date(d.fecha_vencimiento_licencia), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                      </span>
                    </TableCell>

                    <TableCell className="py-4">
                      <DocBadge label="Brevete" fecha={d.fecha_vencimiento_licencia} />
                    </TableCell>

                    <TableCell className="py-4 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewingDriver(d)} className="h-8 w-8 text-slate-400 hover:text-[#0A2342] hover:bg-slate-100 rounded-lg" title="Ver detalles">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(d)} className="h-8 w-8 text-slate-400 hover:text-[#0A2342] hover:bg-slate-100 rounded-lg" title="Editar conductor">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 rounded-lg ${d.estado === 'activo' ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-red-500 hover:bg-red-50'}`}
                          onClick={() => toggleDriverState(d)}
                          title={d.estado === 'activo' ? 'Suspender conductor' : 'Habilitar conductor'}
                        >
                          <Ban className="h-4 w-4" strokeWidth={2.5} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {drivers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No se encontraron conductores con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {}
          <div className="border-t border-slate-100 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-xs font-semibold text-slate-500">
              Mostrando {Math.min((page - 1) * limit + 1, totalRecords)}-{Math.min(page * limit, totalRecords)} de {totalRecords} conductores
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

              {}
              {[...Array(totalPages)].map((_, i) => {

                if (i + 1 === 1 || i + 1 === totalPages || (i + 1 >= page - 1 && i + 1 <= page + 1)) {
                  return (
                    <Button
                      key={i}
                      variant="ghost"
                      className={`h-8 w-8 p-0 rounded-md text-xs font-bold transition-colors ${page === i + 1 ? 'bg-[#0A2342] text-white hover:bg-[#0A2342]/90 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`}
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
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      {viewingDriver && (() => {
        const d = viewingDriver
        return (
          <Dialog open onOpenChange={(open) => !open && setViewingDriver(null)}>
          <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl" aria-describedby={undefined}>
              <DialogTitle className="sr-only">Detalle del Conductor: {d.nombre_completo}</DialogTitle>
              <div className="bg-[#0A2342] p-6 pb-8 text-white relative">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-white/20 shadow-md">
                    <AvatarFallback className="bg-slate-800 text-white font-bold text-xl">
                      {getInitials(d.nombre_completo)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{d.nombre_completo}</h2>
                    <p className="text-white/70 text-sm font-medium mt-0.5">DNI: {d.dni}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white space-y-5 -mt-4 rounded-t-2xl relative z-10">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-500">ESTADO OPERATIVO</span>
                  {d.estado === 'activo' ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">Habilitado</span>
                  ) : d.estado === 'suspendido' ? (
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md">Suspendido</span>
                  ) : (
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">Observado</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Número de Licencia</label>
                    <p className="font-semibold text-sm text-slate-800 mt-1">{d.numero_licencia || 'No registrado'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venc. Licencia</label>
                    <p className="font-semibold text-sm text-slate-800 mt-1">
                      {d.fecha_vencimiento_licencia ? format(new Date(d.fecha_vencimiento_licencia), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teléfono de Contacto</label>
                    <p className="font-semibold text-sm text-slate-800 mt-1">{d.telefono || 'No registrado'}</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

    </div>
  )
}
