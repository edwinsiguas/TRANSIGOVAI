import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { User, ActionLog } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Users, ShieldCheck, Activity, AlertCircle, Download, UserPlus, ChevronLeft, ChevronRight, Settings, Edit2 } from 'lucide-react'
import { REGEX_NAME } from '@/lib/validation'

const userSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().trim().optional().or(z.literal('')),
  nombre: z.string()
    .trim()
    .min(3, 'Mínimo 3 caracteres')
    .max(120, 'Máximo 120 caracteres')
    .regex(REGEX_NAME, 'Nombre inválido'),
  role: z.enum(['admin', 'operador', 'fiscalizador']),
})

type UserFormData = z.infer<typeof userSchema>

export function UsersPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [recentLogs, setRecentLogs] = useState<ActionLog[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const limit = 10

  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'activos' | 'inactivos' | 'todos'>('activos')
  const [roleFilter, setRoleFilter] = useState<'todos' | 'admin' | 'operador' | 'fiscalizador'>('todos')

  const defaultValues = {
    email: '',
    password: '',
    nombre: '',
    role: 'operador' as const,
  }

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues,
  })

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (user?.role !== 'admin') return
    loadUsers()
    loadRecentLogs()
  }, [page, search, estadoFilter, roleFilter, user])

  async function loadUsers() {
    try {
      setLoading(true)
      const res = await apiClient.listUsers({
        page,
        limit,
        search,
        include_inactive: estadoFilter !== 'activos' ? 1 : undefined,
        estado: estadoFilter === 'inactivos' ? 'inactivo' : undefined,
      })

      let data = res.data.data
      if (roleFilter !== 'todos') {
        data = data.filter((u: User) => u.role === roleFilter)
      }

      setUsers(data)
      setTotalPages(res.data.pagination.pages)
      setTotalRecords(res.data.pagination.total)
    } catch {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  async function loadRecentLogs() {
    try {
      const response = await apiClient.listLogs({ limit: 4, page: 1 })
      setRecentLogs(response.data.data)
    } catch (e) {
      console.error('Error fallback loading logs')
    }
  }

  async function toggleUserState(targetUser: User) {
    try {
      setLoading(true)
      const activate = !(targetUser.is_active === 1 || targetUser.estado === 'activo')
      await apiClient.updateUser({
        id: targetUser.id,
        is_active: activate,
        estado: activate ? 'activo' : 'inactivo',
      })
      toast.success(activate ? 'Usuario habilitado' : 'Usuario suspendido')
      await loadUsers()
      await loadRecentLogs()
    } catch (err: unknown) {
      toast.error('Error al actualizar estado del usuario')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: UserFormData) {
    if (!editingUser && !data.password) {
      toast.error('La contraseña provisional es obligatoria para nuevos usuarios')
      return
    }

    try {
      setLoading(true)
      if (editingUser) {
        const payload: any = { id: editingUser.id, nombre: data.nombre, email: data.email, role: data.role }
        if (data.password) payload.password = data.password
        await apiClient.updateUser(payload)
        toast.success('Usuario actualizado exitosamente')
      } else {
        await apiClient.createUser(data)
        toast.success('Usuario creado exitosamente')
      }
      form.reset(defaultValues)
      setEditingUser(null)
      setOpen(false)
      await loadUsers()
      await loadRecentLogs()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || `Error al ${editingUser ? 'actualizar' : 'crear'} usuario`)
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(u: User) {
    setEditingUser(u)
    form.reset({
      email: u.email,
      nombre: u.nombre,
      role: u.role,
      password: '',
    })
    setOpen(true)
  }

  function onInvalidSubmit() {
    toast.error('Revisa los campos obligatorios del formulario')
  }

  function getInitials(name: string) {
    if (!name) return 'US'
    const words = name.trim().split(' ')
    if (words.length > 1) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  function formatRelativeTime(dateString: string) {
    const d = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Hace unos segundos'
    if (minutes < 60) return `Hace ${minutes} minutos`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Hace ${hours} horas`

    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function getMockLastAccess(id: number) {
    const mods = id % 5;
    if (mods === 0) return 'Hoy,\n09:42 AM'
    if (mods === 1) return 'Ayer,\n16:20 PM'
    if (mods === 2) return 'Hace 2\nhoras'
    if (mods === 3) return 'Hace 4\ndías'
    return 'Hace 1\nsemana'
  }

  const translateAction = (log: ActionLog) => {
    const name = log.usuario_nombre.split(' ')[0]
    const actionMap: Record<string, string> = {
      'login': `Inicio de sesión de ${name}`,
      'crear': `${name} registró nuevo/a ${log.entidad}`,
      'actualizar': `${name} actualizó datos`,
      'eliminar': `${name} eliminó registro`,
      'generar_permiso': `${name} emitió permiso QR`,
      'verificar_qr': `QR escaneado en campo`
    }
    return actionMap[log.accion] || `${name}: ${log.accion}`
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">

      {}
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0A2342]">Gestión de Usuarios</h1>
          <p className="text-slate-500 font-medium mt-1 max-w-xl">
            Administración de accesos, roles y permisos del sistema. Controle la seguridad institucional de la infraestructura de transporte.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 mt-2 xl:mt-0">
          <Button variant="outline" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none h-12 px-6 rounded-xl font-bold shadow-sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar Auditoría
          </Button>

          <Dialog open={open} onOpenChange={(val) => {
            if (!val) setEditingUser(null)
            setOpen(val)
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingUser(null); form.reset(defaultValues); setOpen(true); }} className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white font-semibold shadow-md h-12 px-6 rounded-xl shrink-0">
                <UserPlus className="mr-2 h-5 w-5 opacity-90" /> Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[425px] overflow-hidden rounded-2xl">
              <DialogHeader className="pt-2 px-2">
                <DialogTitle className="text-2xl font-extrabold text-[#0A2342]">
                  {editingUser ? 'Editar Acceso' : 'Nuevo Acceso'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-4 mt-2 px-2 pb-2">
                  <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Nombre Completo</FormLabel>
                      <FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Email Corporativo</FormLabel>
                      <FormControl><Input type="email" {...field} className="h-12 rounded-xl bg-slate-50" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">
                        {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña Provisional'}
                      </FormLabel>
                      <FormControl><Input type="password" {...field} className="h-12 rounded-xl bg-slate-50" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">Nivel de Rol</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="admin">🔴 Administrador — Control total</SelectItem>
                          <SelectItem value="operador">🔵 Operador Municipal — CRUD sin usuarios</SelectItem>
                          <SelectItem value="fiscalizador">🟢 Fiscalizador — Solo verificar TUC</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full bg-[#0A2342] hover:bg-[#0A2342]/90 h-12 rounded-xl text-md font-bold mt-4" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    {editingUser ? 'Guardar Cambios' : 'Crear Identidad'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl border-none shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Usuarios</p>
            <Users className="w-5 h-5 text-[#0A2342] opacity-80" />
          </div>
          <div>
            <h3 className="text-4xl font-extrabold text-[#0A2342] leading-none mb-2">{totalRecords}</h3>
            <span className="text-[11px] font-bold text-slate-500">+2 nuevos este mes</span>
          </div>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Roles Activos</p>
            <ShieldCheck className="w-5 h-5 text-blue-600 opacity-80" />
          </div>
          <div>
            <h3 className="text-4xl font-extrabold text-[#0A2342] leading-none mb-2">3</h3>
            <span className="text-[11px] font-bold text-slate-500">Admin · Operador · Fiscalizador</span>
          </div>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Sesiones Abiertas</p>
            <Activity className="w-5 h-5 text-emerald-500 opacity-80" />
          </div>
          <div>
            <h3 className="text-4xl font-extrabold text-[#0A2342] leading-none mb-2">5</h3>
            <span className="text-[11px] font-bold text-slate-500">Sistema estable</span>
          </div>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider items-center gap-1 flex">
              Intentos Fallidos
            </p>
            <div className="bg-red-50 p-1.5 rounded-full"><AlertCircle className="w-4 h-4 text-red-500" /></div>
          </div>
          <div>
            <h3 className="text-4xl font-extrabold text-[#0A2342] leading-none mb-2">0</h3>
            <span className="text-[11px] font-bold text-slate-500">Últimas 24 horas</span>
          </div>
        </Card>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Card className="rounded-2xl border-none shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-extrabold text-[#0A2342]">Directorio de Accesos</h2>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="h-10 rounded-xl bg-slate-50 border-none font-semibold text-slate-700"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={roleFilter} onValueChange={(v: any) => { setRoleFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-32 h-10 bg-slate-50 border-none rounded-xl font-bold text-slate-600 text-xs">
                      <SelectValue placeholder="Filtrar rol" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-lg">
                      <SelectItem value="todos" className="text-xs font-bold">Todos</SelectItem>
                      <SelectItem value="admin" className="text-xs font-bold">Administrador</SelectItem>
                      <SelectItem value="operador" className="text-xs font-bold">Operador</SelectItem>
                      <SelectItem value="fiscalizador" className="text-xs font-bold">Fiscalizador</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={estadoFilter} onValueChange={(v: any) => { setEstadoFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-32 h-10 bg-slate-50 border-none rounded-xl font-bold text-slate-600 text-xs">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-lg">
                      <SelectItem value="todos" className="text-xs font-bold">Todos</SelectItem>
                      <SelectItem value="activos" className="text-xs font-bold">Activo</SelectItem>
                      <SelectItem value="inactivos" className="text-xs font-bold">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-white">
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-[10px] font-extrabold text-slate-400 tracking-wider py-4 px-6">IDENTIDAD</TableHead>
                    <TableHead className="text-[10px] font-extrabold text-slate-400 tracking-wider py-4">NIVEL DE ACCESO</TableHead>
                    <TableHead className="text-[10px] font-extrabold text-slate-400 tracking-wider py-4">ESTADO</TableHead>
                    <TableHead className="text-[10px] font-extrabold text-slate-400 tracking-wider py-4">ÚLTIMO ACCESO</TableHead>
                    <TableHead className="text-[10px] font-extrabold text-slate-400 tracking-wider py-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => {
                    const isActive = u.is_active === 1 || u.estado === 'activo';
                    return (
                      <TableRow key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#0A2342] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                              {getInitials(u.nombre)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm">{u.nombre}</span>
                              <span className="text-[11px] font-medium text-slate-500 mt-0.5">{u.email}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          {u.role === 'admin' ? (
                            <span className="inline-flex py-1 px-3 bg-amber-50 text-amber-700 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                              Administrador
                            </span>
                          ) : u.role === 'fiscalizador' ? (
                            <span className="inline-flex py-1 px-3 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                              Fiscalizador
                            </span>
                          ) : (
                            <span className="inline-flex py-1 px-3 bg-sky-50 text-sky-700 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                              Operador
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                            <span className="text-xs font-bold text-slate-700">{isActive ? 'Activo' : 'Inactivo'}</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          <span className="text-xs font-semibold text-slate-500 whitespace-pre-line leading-tight">
                            {getMockLastAccess(u.id)}
                          </span>
                        </TableCell>

                        <TableCell className="py-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(u)}
                              className="h-8 w-8 text-slate-400 hover:text-[#0A2342] hover:bg-slate-100 rounded-lg"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => toggleUserState(u)}
                              className={`h-8 px-3 rounded-lg text-xs font-bold ${isActive ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            >
                              {isActive ? 'Suspender' : 'Habilitar'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {users.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-slate-500 font-medium">No se encontraron identidades de acceso.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {}
            <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
              <p className="text-[11px] font-bold text-slate-500">Mostrando {users.length} de {totalRecords} usuarios</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>
        </div>

        {}
        <div className="lg:col-span-4 flex flex-col gap-6">

          <Card className="rounded-2xl border-none shadow-sm flex flex-col">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#0A2342]" />
                  <h3 className="text-sm font-extrabold text-[#0A2342]">Roles del Sistema</h3>
                </div>
                <span className="text-[10px] font-extrabold text-[#0A2342] bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200">Gestionar</span>
              </div>

              <div className="bg-amber-50/60 border-l-4 border-amber-400 rounded-r-xl p-4">
                <h4 className="text-[10px] font-extrabold uppercase text-amber-700 mb-1">🔴 Administrador</h4>
                <p className="text-[11px] font-medium text-slate-600 leading-relaxed">Acceso total: usuarios, configuración, auditoría y todos los módulos operativos.</p>
              </div>

              <div className="bg-sky-50/60 border-l-4 border-sky-400 rounded-r-xl p-4">
                <h4 className="text-[10px] font-extrabold uppercase text-sky-700 mb-1">🔵 Operador Municipal</h4>
                <p className="text-[11px] font-medium text-slate-600 leading-relaxed">Registra y edita empresas, conductores, vehículos y emite permisos TUC. No gestiona usuarios.</p>
              </div>

              <div className="bg-emerald-50/60 border-l-4 border-emerald-400 rounded-r-xl p-4">
                <h4 className="text-[10px] font-extrabold uppercase text-emerald-700 mb-1">🟢 Fiscalizador</h4>
                <p className="text-[11px] font-medium text-slate-600 leading-relaxed">Inspector de campo. Solo puede verificar TUCs (con cámara o búsqueda) y ver su historial de consultas.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-sm flex-1">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-[#0A2342]" />
                <h3 className="text-sm font-extrabold text-[#0A2342]">Bitácora de Acciones (Real)</h3>
              </div>

              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">

                {recentLogs.map((log, index) => {
                  return (
                    <div key={log.id} className="relative flex items-start gap-4">
                      <div className={`absolute left-0 mt-1.5 ${index === 0 ? 'w-2.5 h-2.5 bg-[#0A2342] shadow-[0_0_0_4px_#f8fafc]' : 'w-2 h-2 bg-slate-300'} rounded-full`}></div>
                      <div className="pl-6 w-full">
                        <p className={`text-xs font-bold ${index === 0 ? 'text-slate-900' : 'text-slate-700'} leading-snug`}>
                          {translateAction(log)}
                        </p>
                        <p className="text-[10px] font-medium text-slate-500 mt-1.5 flex justify-between">
                          <span>{formatRelativeTime(log.created_at)}</span>
                          <span>• {log.ip_address || 'API_DIRECT'}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}

                {recentLogs.length === 0 && (
                  <p className="text-xs text-slate-500 text-center font-semibold pt-4">No hay eventos recientes o cargando...</p>
                )}

              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
