import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { Assignment, Driver, Vehicle } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Link2, CheckCircle2, XCircle, ChevronsUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { REGEX_DNI, REGEX_NAME } from '@/lib/validation'

const assignmentSchema = z.object({
  vehicle_id: z.string().min(1, 'Debe seleccionar un vehículo'),
  driver_id: z.string().min(1, 'Debe seleccionar un conductor'),
  tipo: z.enum(['propietario', 'alquiler', 'reemplazo_temporal']),
  propietario_nombre: z.string().trim().optional(),
  propietario_dni: z.string().trim().optional(),
  notas: z.string().trim().max(300, 'Máximo 300 caracteres').optional()
}).superRefine((values, ctx) => {
  if (!values.propietario_nombre || values.propietario_nombre.length < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['propietario_nombre'],
      message: 'Nombre de propietario requerido (mínimo 3 caracteres)',
    })
  } else if (!REGEX_NAME.test(values.propietario_nombre)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['propietario_nombre'],
      message: 'Nombre de propietario inválido',
    })
  }

  if (!values.propietario_dni || !REGEX_DNI.test(values.propietario_dni)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['propietario_dni'],
      message: 'DNI de propietario inválido (8 dígitos)',
    })
  }
})

type AssignmentFormData = z.infer<typeof assignmentSchema>

export function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const [page] = useState(1)
  const [isCreating, setIsCreating] = useState(false)

  const defaultValues = { vehicle_id: '', driver_id: '', tipo: 'propietario' as const, propietario_nombre: '', propietario_dni: '', notas: '' }

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues,
  })

  const tipoWatched = form.watch('tipo')
  const driverWatched = form.watch('driver_id')

  useEffect(() => {
    if (tipoWatched === 'propietario' && driverWatched) {
      const selectedDriver = drivers.find(d => String(d.id) === driverWatched)
      if (selectedDriver) {
        form.setValue('propietario_nombre', selectedDriver.nombre_completo, { shouldValidate: true })
        form.setValue('propietario_dni', selectedDriver.dni, { shouldValidate: true })
      }
    } else if (tipoWatched !== 'propietario') {

       if (form.getValues('propietario_nombre') && drivers.find(d => d.dni === form.getValues('propietario_dni'))) {
          form.setValue('propietario_nombre', '', { shouldValidate: false })
          form.setValue('propietario_dni', '', { shouldValidate: false })
       }
    }
  }, [tipoWatched, driverWatched, drivers, form])

  useEffect(() => {
    if (!isCreating) loadAssignments()
  }, [page, isCreating])

  useEffect(() => {
    if (isCreating) loadRefs()
  }, [isCreating])

  async function loadRefs() {
    try {
      const [vRes, dRes] = await Promise.all([
        apiClient.listVehicles({ limit: 1000, estado: 'activo' }),
        apiClient.listDrivers({ limit: 1000, estado: 'activo' })
      ])

      setVehicles(vRes.data.data)
      setDrivers(dRes.data.data)
    } catch {
      toast.error('Error al cargar lista de vehículos/conductores')
    }
  }

  async function loadAssignments() {
    try {
      setLoading(true)
      const res = await apiClient.listAssignments({ page, limit: 10 })
      setAssignments(res.data.data)
    } catch {
      toast.error('Error al cargar asignaciones')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: AssignmentFormData) {
    try {
      setLoading(true)
      await apiClient.createAssignment({
        vehicle_id: Number(data.vehicle_id),
        driver_id: Number(data.driver_id),
        tipo: data.tipo,
        propietario_nombre: data.propietario_nombre,
        propietario_dni: data.propietario_dni,
        notas: data.notas
      })
      toast.success('Asignación registrada exitosamente')
      form.reset(defaultValues)
      setIsCreating(false)
      loadAssignments()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al asignar conductor')
    } finally {
      setLoading(false)
    }
  }

  function onInvalidSubmit() {
    toast.error('Completa correctamente el formulario de asignación')
  }

  async function revokeAssignment(vehicleId: number) {
    if (!confirm('¿Está seguro de desasignar este conductor?')) return
    try {
      setLoading(true)
      await apiClient.unassignVehicle(vehicleId)
      toast.success('Asignación revocada exitosamente')
      loadAssignments()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al revocar asignación')
    } finally {
      setLoading(false)
    }
  }

  if (isCreating) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0A2342]">Vincular Conductor y Vehículo</h1>
            <p className="text-slate-500 font-medium">Asignación dinámica de unidades</p>
          </div>
          <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
        </div>

        <Card className="rounded-2xl border-none shadow-sm">
          <CardContent className="p-8 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="vehicle_id" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Vehículo a Operar</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("h-12 justify-between border-slate-200 bg-white hover:bg-slate-50", !field.value && "text-muted-foreground")}
                            >
                              {field.value
                                ? (vehicles.find((v) => String(v.id) === field.value)?.placa || 'Vehículo seleccionado')
                                : "Buscar vehículo por placa..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Escribe la placa..." />
                            <CommandList>
                              <CommandEmpty>No se encontró ningún vehículo.</CommandEmpty>
                              <CommandGroup>
                                {vehicles.map((v) => (
                                  <CommandItem
                                    value={v.placa}
                                    key={v.id}
                                    onSelect={() => form.setValue("vehicle_id", String(v.id), { shouldValidate: true })}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", String(v.id) === field.value ? "opacity-100 text-emerald-600" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span className="font-bold">{v.placa}</span>
                                      <span className="text-xs text-slate-500">{v.marca} {v.modelo} {v.assignment_id ? '(Tiene asignación activa)' : ''}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="driver_id" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Conductor</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("h-12 justify-between border-slate-200 bg-white hover:bg-slate-50", !field.value && "text-muted-foreground")}
                            >
                              {field.value
                                ? (drivers.find((d) => String(d.id) === field.value)?.dni || 'Conductor seleccionado')
                                : "Buscar conductor por DNI..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Escribe el DNI..." />
                            <CommandList>
                              <CommandEmpty>No se encontró ningún conductor.</CommandEmpty>
                              <CommandGroup>
                                {drivers.map((d) => (
                                  <CommandItem
                                    value={d.dni}
                                    key={d.id}
                                    onSelect={() => form.setValue("driver_id", String(d.id), { shouldValidate: true })}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", String(d.id) === field.value ? "opacity-100 text-emerald-600" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span className="font-bold">{d.dni}</span>
                                      <span className="text-xs text-slate-500">{d.nombre_completo}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="tipo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Vínculo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-12 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="propietario">Propietario / Titular</SelectItem>
                          <SelectItem value="alquiler">Alquiler Formal</SelectItem>
                          <SelectItem value="reemplazo_temporal">Reemplazo Temporal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="notas" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observaciones (Opcional)</FormLabel>
                      <FormControl>
                        <Input className="h-12" placeholder="Nota sobre la asignación" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {}
                <div className="animate-in fade-in slide-in-from-top-3 duration-300 pt-2">
                  <div className={`rounded-2xl border-2 p-6 space-y-4 ${tipoWatched === 'propietario' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${tipoWatched === 'propietario' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                      <h4 className={`font-bold text-sm ${tipoWatched === 'propietario' ? 'text-emerald-800' : 'text-amber-800'}`}>Datos del Propietario del Vehículo</h4>
                      <span className={`text-xs font-medium ${tipoWatched === 'propietario' ? 'text-emerald-600' : 'text-amber-600'}`}>
                         {tipoWatched === 'propietario' ? '(Autocompletado como Titular)' : '(Requerido para vinculación legal)'}
                      </span>
                    </div>
                    <p className={`text-xs ${tipoWatched === 'propietario' ? 'text-emerald-700' : 'text-amber-700'}`}>Indique quién es el dueño legal de la unidad operativa.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="propietario_nombre" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`text-xs font-bold ${tipoWatched === 'propietario' ? 'text-emerald-800' : 'text-amber-800'}`}>Nombre Completo del Propietario</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={tipoWatched==='propietario'} className={`h-12 bg-white ${tipoWatched === 'propietario' ? 'border-emerald-200 cursor-not-allowed opacity-80' : 'border-amber-200 focus:ring-amber-400'}`} placeholder="Ej: Juan Carlos Pérez Mamani" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="propietario_dni" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`text-xs font-bold ${tipoWatched === 'propietario' ? 'text-emerald-800' : 'text-amber-800'}`}>DNI del Propietario</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              maxLength={8}
                              inputMode="numeric"
                              readOnly={tipoWatched==='propietario'}
                              className={`h-12 bg-white ${tipoWatched === 'propietario' ? 'border-emerald-200 cursor-not-allowed opacity-80' : 'border-amber-200 focus:ring-amber-400'}`}
                              placeholder="12345678"
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={loading} className="bg-[#0A2342] hover:bg-[#0A2342]/90 h-12 px-8">
                    {loading ? 'Asignando...' : 'Crear Asignación'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0A2342]">Asignaciones Vehiculares</h1>
          <p className="text-slate-500 font-medium">Gestión dinámica de quién conduce qué vehículo en el tiempo.</p>
        </div>
        <Button onClick={() => { form.reset(defaultValues); setIsCreating(true); }} className="bg-[#0A2342] hover:bg-[#0A2342]/90 rounded-xl px-6 py-6 font-bold shadow-md">
          <Link2 className="w-5 h-5 mr-2" /> Nueva Asignación
        </Button>
      </div>

      <Card className="rounded-2xl border-none shadow-sm h-full">
        <Table>
          <TableHeader className="bg-slate-100/50">
            <TableRow className="border-none">
              <TableHead className="font-bold py-4">VEHÍCULO</TableHead>
              <TableHead className="font-bold py-4">CONDUCTOR</TableHead>
              <TableHead className="font-bold py-4">TIPO VÍNCULO</TableHead>
              <TableHead className="font-bold py-4">PROPIETARIO</TableHead>
              <TableHead className="font-bold py-4">ESTADO</TableHead>
              <TableHead className="font-bold text-right py-4 pr-6">ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map(a => (
              <TableRow key={a.id}>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 border border-slate-200 bg-white w-fit px-2 py-0.5 rounded shadow-sm mb-1">{a.placa}</span>
                    <span className="text-xs text-slate-500">{a.marca} {a.modelo}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#0A2342]">{a.nombre_completo}</span>
                    <span className="text-xs text-slate-500">DNI: {a.dni}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <span className="capitalize font-semibold text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    {a.tipo.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell className="py-4">
                  {a.propietario_nombre ? (
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-amber-800">{a.propietario_nombre}</span>
                      <span className="text-xs text-slate-500">DNI: {a.propietario_dni}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">N/A</span>
                  )}
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center gap-1.5">
                    {a.activo
                      ? <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm font-semibold text-emerald-600">Activa</span></>
                      : <><XCircle className="w-4 h-4 text-slate-400" /><span className="text-sm font-semibold text-slate-500">Histórica</span></>
                    }
                  </div>
                </TableCell>
                <TableCell className="py-4 pr-6 text-right">
                  {a.activo === 1 && (
                    <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => revokeAssignment(a.vehicle_id)}>
                      Desvincular
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {assignments.length === 0 && !loading && (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-500">No hay asignaciones registradas.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
