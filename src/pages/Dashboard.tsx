import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Users, Building2, Truck, AlertTriangle } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { FlotaChart } from '@/components/dashboard/FlotaChart'
import { TramitesChart } from '@/components/dashboard/TramitesChart'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { UpcomingExpirations } from '@/components/dashboard/UpcomingExpirations'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

export function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState({
    users: 0,
    companies: 0,
    drivers: 0,
    permits_active: 0,
    permits_expiring: 0,
    inspections_today: 0,
    vehicles: 0,
    flota_chart: [] as any[],
    tramites_chart: [] as any[],
    recent_activity: [] as any[],
    upcoming_expirations: [] as any[]
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') {
      navigate('/empresa', { replace: true })
      return
    }
  }, [user, navigate])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    const loadStats = async () => {
      try {
        const dashboardStats = await apiClient.getDashboardStats()

        let usersTotal = 0;
        try {
          const uRes = await apiClient.listUsers({limit:1, page:1})
          usersTotal = uRes.data.pagination.total
        } catch(e) {}

        setStats({
          users: usersTotal,
          companies: dashboardStats.data.companies ?? 0,
          drivers: dashboardStats.data.drivers ?? 0,
          permits_active: dashboardStats.data.permits_active ?? 0,
          permits_expiring: dashboardStats.data.permits_expiring ?? 0,
          inspections_today: dashboardStats.data.inspections_today ?? 0,
          vehicles: dashboardStats.data.vehicles ?? 0,
          flota_chart: dashboardStats.data.flota_chart || [],
          tramites_chart: dashboardStats.data.tramites_chart || [],
          recent_activity: dashboardStats.data.recent_activity || [],
          upcoming_expirations: dashboardStats.data.upcoming_expirations || [],
        })
      } catch (error) {
        toast.error('Error al cargar estadísticas (Conexión PDO fallida)')
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#0A2342] mx-auto mb-4"></div>
          <p className="text-slate-500 font-semibold">Sincronizando con base de datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">

      {}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Panel de Control General</h1>
        <p className="text-slate-500 font-semibold mt-1">Gestión y monitoreo de la red de transporte distrital.</p>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Conductores Habilitados"
          value={stats.drivers}
          icon={Users}
        />
        <StatCard
          title="Vehículos Autorizados"
          value={stats.vehicles}
          icon={Truck}
        />
        <StatCard
          title="Alertas Soat Vencidos"
          value={stats.permits_expiring}
          icon={AlertTriangle}
          alert={stats.permits_expiring > 0}
        />
        <StatCard
          title="Empresas Registradas"
          value={stats.companies}
          icon={Building2}
        />
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <FlotaChart data={stats.flota_chart} />
        </div>
        <div className="lg:col-span-2">
          <TramitesChart data={stats.tramites_chart} />
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity data={stats.recent_activity} />
        </div>
        <div className="lg:col-span-1">
          <UpcomingExpirations data={stats.upcoming_expirations} />
        </div>
      </div>

    </div>
  )
}
