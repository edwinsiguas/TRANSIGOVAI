import { useState } from 'react'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, ShieldCheck } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().trim().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: LoginFormData) {
    try {
      setIsLoading(true)
      const user = await login(data.email, data.password)

      toast.success('¡Bienvenido al sistema!')

      if (user.role === 'admin') {
        navigate('/dashboard')
      } else {
        navigate('/empresa')
      }
    } catch (error: any) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
          || (!error.response
            ? 'No se pudo conectar con el servicio Java. Verifica que esté iniciado y revisa la configuración de red/CORS.'
            : 'No se pudo iniciar sesión. Revisa el estado del servicio e inténtalo nuevamente.')
        : error instanceof Error
          ? error.message
          : 'No se pudo iniciar sesión. Inténtalo nuevamente.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex w-full bg-white animate-in fade-in duration-700">

      {}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0A2342] flex-col justify-between p-12 relative overflow-hidden">
        {}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40V0H40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
          {}
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[120px] opacity-30 mix-blend-screen"></div>
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-emerald-500 rounded-full blur-[100px] opacity-20 mix-blend-screen"></div>
        </div>

        <div className="relative z-10">
        </div>

        <div className="relative z-10 max-w-lg mb-12">
          <img src="/Marcona_Escudo.png" alt="Escudo de Marcona" className="w-32 h-32 object-contain mb-8 drop-shadow-2xl" />
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
            Gestión de<br />Movilidad Urbana
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed font-medium">
            Plataforma oficial para el registro, control y fiscalización del transporte público y privado de la Municipalidad Distrital de Marcona.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-slate-300">Acceso Seguro & Encriptado</span>
        </div>
      </div>

      {}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative bg-white">

        {}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
          <img src="/Marcona_Escudo.png" alt="Escudo Marcona" className="w-10 h-10 object-contain drop-shadow-sm" />
          <div className="flex flex-col">
            <span className="font-extrabold text-[#0A2342] text-sm leading-tight">Marcona</span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Gestión de Movilidad</span>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0A2342]">Bienvenido de vuelta</h2>
            <p className="text-slate-500 font-medium mt-2">
              Ingresa tus credenciales para acceder al panel de administración.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input placeholder="Correo corporativo" type="email" className="h-14 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-base transition-colors" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contraseña</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" className="h-14 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-base transition-colors font-mono tracking-widest" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-[#0A2342] hover:bg-[#0A2342]/90 text-white h-14 rounded-xl text-base font-bold shadow-md shadow-[#0A2342]/20 mt-2" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-3 h-5 w-5 animate-spin text-white" />}
                Ingresar al Sistema
              </Button>
            </form>
          </Form>

        </div>
      </div>
    </div>
  )
}
