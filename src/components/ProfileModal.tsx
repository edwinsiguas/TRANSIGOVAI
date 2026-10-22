import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { Loader2, Settings } from 'lucide-react'
import { REGEX_NAME } from '@/lib/validation'

const profileSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120, 'Máximo 120 caracteres').regex(REGEX_NAME, 'Nombre inválido'),
  password: z.string().trim().optional().or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function ProfileModal() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || '',
      nombre: user?.nombre || '',
      password: '',
    },
  })

  async function onSubmit(data: ProfileFormData) {
    if (!user) return
    try {
      setLoading(true)
      const payload: any = { id: user.id, nombre: data.nombre, email: data.email }
      if (data.password) payload.password = data.password

      await apiClient.updateUser(payload)
      toast.success('Perfil actualizado. Inicie sesión nuevamente para ver los cambios.')
      setOpen(false)
      form.reset({ ...data, password: '' })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Error al actualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (val) {
        form.reset({ email: user.email, nombre: user.nombre, password: '' })
      }
      setOpen(val)
    }}>
      <DialogTrigger asChild>
        <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-sm font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-800">
          <Settings className="h-[18px] w-[18px]" />
          Editar Perfil
        </button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[425px] overflow-hidden rounded-2xl">
        <DialogHeader className="pt-2 px-2">
          <DialogTitle className="text-2xl font-extrabold text-[#0A2342]">Mi Perfil</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2 px-2 pb-2">
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
                <FormLabel className="text-xs font-bold text-slate-700">Nueva Contraseña (opcional)</FormLabel>
                <FormControl><Input type="password" {...field} className="h-12 rounded-xl bg-slate-50" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full bg-[#0A2342] hover:bg-[#0A2342]/90 h-12 rounded-xl text-md font-bold mt-4" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Guardar Cambios
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
