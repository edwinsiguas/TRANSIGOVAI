import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LogOut, Menu, X, LayoutDashboard, Users, Truck, FileText,
  History, Building2, Search, RotateCw, ScanLine, ShieldCheck,
  UserCog, Link2
} from 'lucide-react'
import { toast } from 'sonner'
import { UserRole } from '@/types'
import { ProfileModal } from '@/components/ProfileModal'

interface LayoutProps {
  children: React.ReactNode
}

interface MenuItem {
  label: string
  icon: React.ElementType
  path: string
  roles: UserRole[]
  badge?: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  operador: 'Operador Municipal',
  fiscalizador: 'Fiscalizador',
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-amber-100 text-amber-700',
  operador: 'bg-sky-100 text-sky-700',
  fiscalizador: 'bg-emerald-100 text-emerald-700',
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    try {
      await logout()
      toast.success('Sesión cerrada')
      navigate('/login')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  const menuItems: MenuItem[] = [

    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      roles: ['admin', 'operador'],
    },
    {
      label: 'Empresas',
      icon: Building2,
      path: '/empresas',
      roles: ['admin', 'operador'],
    },
    {
      label: 'Conductores',
      icon: Users,
      path: '/choferes',
      roles: ['admin', 'operador'],
    },
    {
      label: 'Vehículos',
      icon: Truck,
      path: '/vehiculos',
      roles: ['admin', 'operador'],
    },
    {
      label: 'Asignaciones',
      icon: Link2,
      path: '/asignaciones',
      roles: ['admin', 'operador'],
    },
    {
      label: 'Permisos',
      icon: FileText,
      path: '/permisos',
      roles: ['admin', 'operador'],
    },
    {
      label: 'Renovaciones',
      icon: RotateCw,
      path: '/renovaciones',
      roles: ['admin', 'operador'],
    },
    {
      label: 'Historial',
      icon: History,
      path: '/historial',
      roles: ['admin', 'operador'],
    },

    {
      label: 'Usuarios',
      icon: UserCog,
      path: '/usuarios',
      roles: ['admin'],
      badge: 'Admin',
    },

    {
      label: 'Inicio',
      icon: LayoutDashboard,
      path: '/fiscalizador',
      roles: ['fiscalizador'],
    },
    {
      label: 'Verificar TUC',
      icon: ScanLine,
      path: '/verificar',
      roles: ['fiscalizador'],
    },

    {
      label: 'Verificar TUC',
      icon: ScanLine,
      path: '/verificar',
      roles: ['admin', 'operador'],
    },
  ]

  const role = (user?.role ?? 'operador') as UserRole
  const visibleItems = menuItems.filter((item) => item.roles.includes(role))

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex font-sans text-slate-800">

      {}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#F8FAFC] border-r border-slate-200 transform transition-transform md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>

        {}
        <div className="h-20 px-6 flex items-center shrink-0">
          <div className="flex items-center gap-3">
            <img src="/Marcona_Escudo.png" alt="Escudo Marcona" className="w-11 h-11 object-contain drop-shadow-sm" />
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-900 leading-tight">Marcona</span>
              <span className="font-extrabold text-slate-900 leading-tight">Movilidad</span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Administración Distrital</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {}
        <div className="px-4 pb-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${ROLE_COLORS[role]}`}>
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            {ROLE_LABELS[role]}
          </div>
        </div>

        {}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <button
                key={item.path + item.label}
                onClick={() => { navigate(item.path); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold group
                  ${isActive
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                  }`}
              >
                <item.icon
                  className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-600'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {}
        <div className="px-4 py-4 border-t border-slate-200 space-y-1">
          {}
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-bold text-slate-800 truncate">{user?.nombre}</p>
            <p className="text-[10px] text-slate-400 font-medium truncate">{user?.email}</p>
          </div>

          <ProfileModal />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {}
        <header className="h-20 bg-[#F4F7FB] px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden mr-4 bg-white p-2 rounded-lg shadow-sm">
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-800 hidden sm:block">Municipalidad de Marcona</h2>
          </div>

          <div className="flex flex-1 justify-end items-center gap-6">
            {}
            {role !== 'fiscalizador' && (
              <div className="relative hidden md:block max-w-sm w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border-none rounded-xl text-sm bg-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A2342] focus:bg-white"
                  placeholder="Buscar registros..."
                />
              </div>
            )}
          </div>
        </header>

        {}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F4F7FB] p-4 md:p-8 pb-20 md:pb-12">
          {children}
        </main>

        {}
        <footer className="h-14 bg-[#F4F7FB] border-t border-slate-200 px-4 md:px-8 flex items-center justify-between text-[11px] font-semibold text-slate-400 shrink-0">
          <p>© 2025 Municipalidad Distrital de Marcona — Gestión de Transporte</p>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#" className="hover:text-slate-600 transition-colors">Transparencia</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Contacto</a>
          </div>
        </footer>
      </div>

      {}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
