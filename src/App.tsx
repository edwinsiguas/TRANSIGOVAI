import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { CompaniesPage } from '@/pages/Companies'
import { PermitsPage } from '@/pages/Permits'
import { RenewalsPage } from '@/pages/Renewals'
import { HistorialPage } from '@/pages/Historial'
import { UsersPage } from '@/pages/Users'
import { DriversPage } from '@/pages/Drivers'
import { VehiclesPage } from '@/pages/Vehicles'
import { AssignmentsPage } from '@/pages/Assignments'
import { EmpresaDashboard } from '@/pages/RoleHome'
import { PublicConsultaPage } from '@/pages/PublicConsulta'
import { TucPublicaPage } from '@/pages/TucPublica'
import { FiscalizadorHome } from '@/pages/FiscalizadorHome'
import { VerificarPage } from '@/pages/Verificar'
import { Toaster } from 'sonner'
import './index.css'

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles?: string[]
}) {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {

    if (user.role === 'fiscalizador') return <Navigate to="/fiscalizador" replace />
    return <Navigate to="/dashboard" replace />
  }

  return <Layout>{children}</Layout>
}

function HomeRedirect() {
  const { user, loading, isAuthenticated } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role === 'fiscalizador') return <Navigate to="/fiscalizador" replace />
  return <Navigate to="/dashboard" replace />
}

const ADMIN_ONLY   = ['admin']
const OPERATIVE    = ['admin', 'operador']
const ALL_STAFF    = ['admin', 'operador', 'fiscalizador']

export default function App() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {}
        <Route path="/login"       element={<LoginPage />} />
        <Route path="/"            element={<HomeRedirect />} />
        <Route path="/consulta"    element={<PublicConsultaPage />} />
        <Route path="/tuc/:numero" element={<TucPublicaPage />} />

        {}
        <Route path="/fiscalizador" element={
          <ProtectedRoute allowedRoles={ALL_STAFF}>
            <FiscalizadorHome />
          </ProtectedRoute>
        } />
        <Route path="/verificar" element={
          <ProtectedRoute allowedRoles={ALL_STAFF}>
            <VerificarPage />
          </ProtectedRoute>
        } />

        {}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={OPERATIVE}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/empresas" element={
          <ProtectedRoute allowedRoles={OPERATIVE}>
            <CompaniesPage />
          </ProtectedRoute>
        } />
        <Route path="/choferes" element={
          <ProtectedRoute allowedRoles={OPERATIVE}>
            <DriversPage />
          </ProtectedRoute>
        } />
        <Route path="/vehiculos" element={
          <ProtectedRoute allowedRoles={OPERATIVE}>
            <VehiclesPage />
          </ProtectedRoute>
        } />
        <Route path="/asignaciones" element={
          <ProtectedRoute allowedRoles={OPERATIVE}>
            <AssignmentsPage />
          </ProtectedRoute>
        } />
        <Route path="/permisos" element={
          <ProtectedRoute allowedRoles={OPERATIVE}>
            <PermitsPage />
          </ProtectedRoute>
        } />
        <Route path="/renovaciones" element={
          <ProtectedRoute allowedRoles={OPERATIVE}>
            <RenewalsPage />
          </ProtectedRoute>
        } />
        <Route path="/historial" element={
          <ProtectedRoute allowedRoles={OPERATIVE}>
            <HistorialPage />
          </ProtectedRoute>
        } />

        {}
        <Route path="/usuarios" element={
          <ProtectedRoute allowedRoles={ADMIN_ONLY}>
            <UsersPage />
          </ProtectedRoute>
        } />

        {}
        <Route path="/empresa" element={
          <ProtectedRoute allowedRoles={OPERATIVE}>
            <EmpresaDashboard />
          </ProtectedRoute>
        } />
      </Routes>
      <Toaster position="top-center" />
    </BrowserRouter>
  )
}
