import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { Company } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Loader2, Filter, RotateCw, List, LayoutGrid, Eye, Pencil, Ban, ChevronLeft, ChevronRight, Lightbulb, Building2, Bus, Map as MapIcon, BellRing, Download } from 'lucide-react'
import { REGEX_NAME, REGEX_PHONE, REGEX_RUC } from '@/lib/validation'
import { downloadJavaExcelReport } from '@/lib/java-report-client'

const companySchema = z.object({
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres').max(150, 'Máximo 150 caracteres').regex(REGEX_NAME, 'Razón social inválida'),
  ruc: z.string().trim().regex(REGEX_RUC, 'RUC debe tener 11 dígitos'),
  telefono: z.string().trim().regex(REGEX_PHONE, 'Teléfono inválido'),
  email: z.string().trim().email('Email inválido'),
  direccion: z.string().trim().min(5, 'Dirección muy corta').max(255, 'Dirección muy larga'),
  contacto: z.string().trim().min(3, 'Nombre de contacto mínimo 3 caracteres').max(120, 'Máximo 120 caracteres').regex(REGEX_NAME, 'Nombre de contacto inválido'),
  estado: z.enum(['activo', 'inactivo']).optional(),
})

type CompanyFormData = z.infer<typeof companySchema>

export function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [activeRecords, setActiveRecords] = useState(0)
  const limit = 10

  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'activos' | 'inactivos' | 'todos'>('todos')

  const [stats, setStats] = useState({
    vehicles: 0,
    rutas: 0,
    proximos: 0
  })

  const defaultValues = {
    nombre: '',
    ruc: '',
    telefono: '',
    email: '',
    direccion: '',
    contacto: '',
    estado: 'activo' as const,
  }

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues,
  })

  useEffect(() => {
    loadCompanies()
  }, [page, search, estadoFilter])

  async function loadCompanies() {
    try {
      setLoading(true)

      apiClient.getCompanyStats().then(res => {
        if (res.success && res.data) {
          setStats(res.data)
        }
      }).catch(e => console.error("Stats load failed", e));

      const backendEstado = estadoFilter === 'todos' ? '' : (estadoFilter === 'activos' ? 'activo' : 'inactivo');

      const res = await apiClient.listCompanies({
        page,
        limit,
        search,
        estado: backendEstado
      })

      setCompanies(res.data.data)
      setTotalPages(res.data.pagination.pages)
      setTotalRecords(res.data.pagination.total)
      setActiveRecords(res.data.pagination.active_total || 0)
    } catch (error) {
      toast.error('Error al cargar empresas')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: CompanyFormData) {
    try {
      setLoading(true)
      if (editingId) {
        await apiClient.updateCompany({ ...data, id: editingId })
        toast.success('Empresa actualizada')
      } else {
        await apiClient.createCompany(data)
        toast.success('Empresa creada correctamente')
      }
      form.reset(defaultValues)
      setIsDialogOpen(false)
      setEditingId(null)
      loadCompanies()
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error al guardar la empresa'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function onInvalidSubmit() {
    toast.error('Revisa los campos del formulario de empresa')
  }

  async function toggleCompanyState(company: Company) {
    if (!confirm(`¿Está seguro de ${company.estado === 'activo' ? 'SUSPENDER' : 'HABILITAR'} a la empresa ${company.nombre}?`)) return
    try {
      setLoading(true)
      const activate = company.estado !== 'activo'
      await apiClient.toggleCompanyStatus(company.id)
      toast.success(activate ? 'Empresa habilitada' : 'Empresa suspendida')
      await loadCompanies()
    } catch (err: unknown) {
      toast.error('Error al actualizar estado')
    } finally {
      setLoading(false)
    }
  }

  function openEditDialog(company: Company) {
    form.reset({
      nombre: company.nombre,
      ruc: company.ruc,
      telefono: company.telefono,
      email: company.email,
      direccion: company.direccion,
      contacto: company.contacto,
      estado: company.estado,
    })
    setEditingId(company.id)
    setIsDialogOpen(true)
  }

  async function downloadExcel() {
    try {
      setLoading(true)
      toast.info('Generando reporte con Java...')
      const response = await apiClient.exportCompanies({
        search: search.trim(),
        estado: estadoFilter
      })
      
      if (!response.data || response.data.length === 0) {
        toast.error('No hay datos para exportar')
        return
      }

      // Mapear los datos para que las cabeceras sean amigables en Excel
      const excelData = response.data.map((c: any) => ({
        'ID': c.id,
        'Razón Social': c.razon_social,
        'RUC': c.ruc,
        'Representante Legal': c.representante_legal,
        'Teléfono': c.telefono,
        'Email': c.email,
        'Dirección': c.direccion,
        'Estado': c.estado === 'activo' ? 'Habilitada' : 'Suspendida',
        'Fecha Registro': c.fecha_registro,
        'Total Vehículos': c.total_vehiculos,
        'Vehículos SOAT Vencido': c.vehiculos_soat_vencido,
        'Vehículos RT Vencida': c.vehiculos_rt_vencida,
        'Total Conductores': c.total_conductores,
        'Cond. Brevete Vencido': c.conductores_brevete_vencido,
        'Permisos TUC Vigentes': c.tucs_vigentes,
        'Permisos TUC Vencidos': c.tucs_vencidos
      }))

      await downloadJavaExcelReport(
        'Reporte de empresas operadoras MTC Marcona',
        excelData,
        'Reporte_Empresas_Java',
      )
      toast.success('Reporte Excel generado con Java y descargado correctamente')

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al generar el reporte Excel')
    } finally {
      setLoading(false)
    }
  }

  function getInitials(name: string) {
    if (!name) return 'EMP'
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">

      {}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0A2342] uppercase">Gestión de Empresas de Transporte</h1>
          <p className="text-slate-500 font-medium mt-1">
            Registro y control de las empresas operadoras del distrito.
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
              <Button onClick={() => { form.reset(defaultValues); setEditingId(null) }} className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white font-semibold shadow-md h-14 px-6 rounded-xl flex items-center justify-center shrink-0">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 opacity-90" />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="font-bold text-sm">Registrar Nueva</span>
                    <span className="font-bold text-sm">Empresa</span>
                  </div>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[500px] overflow-hidden rounded-2xl" aria-describedby={undefined}>
            <DialogHeader className="pt-2 px-2">
              <DialogTitle className="text-2xl font-extrabold text-[#0A2342]">{editingId ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-4 mt-2 px-2 pb-2">
                <FormField control={form.control} name="nombre" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">Razón Social</FormLabel>
                    <FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ruc" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">RUC</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={11}
                        inputMode="numeric"
                        className="h-12 rounded-xl bg-slate-50 uppercase"
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Email Corporativo</FormLabel>
                      <FormControl><Input type="email" {...field} className="h-12 rounded-xl bg-slate-50" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="telefono" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          maxLength={15}
                          inputMode="numeric"
                          className="h-12 rounded-xl bg-slate-50"
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="direccion" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">Sede Principal / Dirección</FormLabel>
                    <FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="contacto" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700">Representante Legal</FormLabel>
                    <FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full bg-[#0A2342] hover:bg-[#0A2342]/90 h-12 rounded-xl text-md font-bold mt-4" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {editingId ? 'Guardar Cambios' : 'Registrar Empresa'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl border-none shadow-sm flex flex-col justify-between p-6">
          <div className="flex justify-between items-start mb-2">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Building2 className="w-5 h-5" /></div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 leading-none">{activeRecords}</h3>
            <p className="text-xs font-bold text-slate-500 mt-2">Empresas Activas</p>
          </div>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm flex flex-col justify-between p-6">
          <div className="flex justify-between items-start mb-2">
            <div className="p-3 bg-slate-100 text-[#0A2342] rounded-xl"><Bus className="w-5 h-5" /></div>
            <span className="text-[11px] font-extrabold text-slate-600">Total Marcona</span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 leading-none">{stats.vehicles}</h3>
            <p className="text-xs font-bold text-slate-500 mt-2">Vehículos Vinculados</p>
          </div>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm flex flex-col justify-between p-6">
          <div className="flex justify-between items-start mb-2">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><MapIcon className="w-5 h-5" /></div>
            <span className="text-[11px] font-extrabold text-slate-600">Red Activa</span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 leading-none">{stats.rutas}</h3>
            <p className="text-xs font-bold text-slate-500 mt-2">Rutas Autorizadas</p>
          </div>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm flex flex-col justify-between p-6">
          <div className="flex justify-between items-start mb-2">
            <div className="p-3 bg-red-50 text-red-500 rounded-xl"><BellRing className="w-5 h-5" /></div>
            {stats.proximos > 0 && <span className="text-[11px] font-extrabold text-red-600 bg-red-50 px-2 py-1 rounded-md">Crítico</span>}
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 leading-none">{stats.proximos}</h3>
            <p className="text-xs font-bold text-slate-500 mt-2">Vencimientos Próximos</p>
          </div>
        </Card>
      </div>

      {}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4 items-end">

          <div className="space-y-1.5 w-full sm:w-64 relative">
            <Input
              placeholder="Buscar empresa o RUC..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-11 rounded-xl bg-slate-100/80 border-none font-semibold text-slate-700 placeholder:font-normal focus-visible:ring-2 focus-visible:ring-[#0A2342]/20"
            />
          </div>

          <div className="w-full sm:w-48">
            <Select value={estadoFilter} onValueChange={(val: any) => { setEstadoFilter(val); setPage(1); }}>
              <SelectTrigger className="w-full h-11 bg-transparent border-none focus:ring-0 font-semibold text-slate-600 shadow-none hover:bg-slate-50">
                <SelectValue placeholder="Filtrar por Estado" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-lg">
                <SelectItem value="todos" className="font-medium">Todos los estados</SelectItem>
                <SelectItem value="activos" className="font-medium">Activos / Habilitados</SelectItem>
                <SelectItem value="inactivos" className="font-medium">Inactivos / Suspendidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 border-l border-slate-200 pl-4">
            <Button variant="ghost" className="h-11 w-11 p-0 rounded-full hover:bg-slate-100 text-slate-500">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={loadCompanies} className="h-11 w-11 p-0 rounded-full hover:bg-slate-100 text-slate-500" disabled={loading}>
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 pr-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visualización</span>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Button variant="ghost" className="h-7 w-7 p-0 rounded bg-white shadow-sm hover:bg-white text-[#0A2342]"><List className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" className="h-7 w-7 p-0 rounded text-slate-400 hover:bg-transparent hover:text-slate-600"><LayoutGrid className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>

      {}
      <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-white border-b border-slate-100">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[11px] font-extrabold text-slate-400 tracking-wider py-5 px-6">EMPRESA</TableHead>
                  <TableHead className="text-[11px] font-extrabold text-slate-400 tracking-wider py-5">RUC / LEGAL</TableHead>
                  <TableHead className="text-[11px] font-extrabold text-slate-400 tracking-wider py-5">FLOTA</TableHead>
                  <TableHead className="text-[11px] font-extrabold text-slate-400 tracking-wider py-5">ESTADO</TableHead>
                  <TableHead className="text-[11px] font-extrabold text-slate-400 tracking-wider py-5 text-right pr-8">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm font-bold text-sm bg-blue-50 text-[#0A2342] flex items-center justify-center">
                          <AvatarFallback className="bg-transparent">{getInitials(company.nombre)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 text-sm">{company.nombre}</span>
                          <span className="text-[11px] font-semibold text-slate-500 mt-0.5">Transporte de Pasajeros</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 font-mono text-sm">{company.ruc}</span>
                        <span className="text-[11px] font-semibold text-slate-500 pr-4 mt-0.5">{company.contacto}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex items-center font-bold text-slate-700 text-sm gap-2">
                        <Bus className="w-3.5 h-3.5 text-slate-400" />
                        {company.flota || 0}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      {company.estado === 'activo' ? (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className="text-[11px] font-extrabold tracking-wide">HABILITADO</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-red-50 text-red-600 gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                          <span className="text-[11px] font-extrabold tracking-wide">SUSPENDIDO</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-4 pr-6">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}> {}
                        <Button variant="ghost" size="icon" onClick={() => setViewingCompany(company)} className="h-8 w-8 text-slate-400 hover:text-[#0A2342] hover:bg-slate-100 rounded-lg" title="Ver detalles">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(company)} className="h-8 w-8 text-slate-400 hover:text-[#0A2342] hover:bg-slate-100 rounded-lg" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 rounded-lg ${company.estado === 'activo' ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-red-500 hover:bg-red-50'}`}
                          onClick={() => toggleCompanyState(company)}
                          title={company.estado === 'activo' ? 'Suspender empresa' : 'Habilitar empresa'}
                        >
                          <Ban className="h-4 w-4" strokeWidth={2.5} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {companies.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      No se encontraron empresas con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="border-t border-slate-100 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-xs font-semibold text-slate-500">
              Mostrando {totalRecords === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, totalRecords)} de {totalRecords} empresas operadoras
            </span>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 data-[disabled]:opacity-50" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {[...Array(totalPages)].map((_, i) => {
                if (i + 1 === 1 || i + 1 === totalPages || (i + 1 >= page - 1 && i + 1 <= page + 1)) {
                  return (
                    <Button key={i} variant="ghost" className={`h-8 w-8 p-0 rounded-md text-xs font-bold transition-colors ${page === i + 1 ? 'bg-[#0A2342] text-white hover:bg-[#0A2342]/90 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => setPage(i + 1)}>
                      {i + 1}
                    </Button>
                  );
                }
                if ((i + 1 === page - 2 && page > 3) || (i + 1 === page + 2 && page < totalPages - 2)) {
                  return <span key={i} className="text-slate-400 font-bold px-1">...</span>;
                }
                return null;
              })}

              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 data-[disabled]:opacity-50" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages || totalPages === 0}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <div className="bg-[#F3F4F6] rounded-2xl p-6 flex gap-5 items-start mt-4 shadow-sm border border-slate-200/60">
        <div className="p-3 bg-[#0A2342] rounded-full shrink-0">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="font-extrabold text-slate-900 text-sm mb-1">Tip de Gestión Municipal</h4>
          <p className="text-xs font-medium text-slate-600 leading-relaxed max-w-4xl">
            Recuerde que todas las empresas con estado "Suspendido" no aparecerán en los reportes de despacho diario. Asegúrese de revisar la documentación pendiente para regularizar su situación operativa antes de los operativos de fin de mes.
          </p>
        </div>
      </div>

      {}
      {viewingCompany && (
        <Dialog open={!!viewingCompany} onOpenChange={(open) => !open && setViewingCompany(null)}>
          <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl" aria-describedby={undefined}>
            <DialogTitle className="sr-only">Detalle de Empresa: {viewingCompany?.nombre}</DialogTitle>
            <div className="bg-[#0A2342] p-6 pb-8 text-white relative">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-xl">
                    <Building2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{viewingCompany.nombre}</h2>
                    <p className="text-white/70 text-sm font-medium mt-0.5">RUC: {viewingCompany.ruc}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white space-y-5 -mt-4 rounded-t-2xl relative z-10">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500">ESTADO OPERATIVO</span>
                {viewingCompany.estado === 'activo' ? (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">Habilitado</span>
                ) : (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md">Suspendido</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Representante / Contacto</label>
                  <p className="font-semibold text-sm text-slate-800 mt-1">{viewingCompany.contacto}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teléfono</label>
                  <p className="font-semibold text-sm text-slate-800 mt-1">{viewingCompany.telefono}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
                  <p className="font-semibold text-sm text-slate-800 mt-1">{viewingCompany.email}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dirección Fiscal</label>
                  <p className="font-semibold text-sm text-slate-800 mt-1">{viewingCompany.direccion}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
