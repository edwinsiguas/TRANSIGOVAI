import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FileText, History, Users, Truck } from 'lucide-react'

export function EmpresaDashboard() {
  const navigate = useNavigate()
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Panel empresa</h1>
      <p className="text-muted-foreground mb-6">Accesos rápidos</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choferes</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate('/choferes')}>
              <Users className="mr-2 h-4 w-4" /> Ir a choferes
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vehículos</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate('/vehiculos')}>
              <Truck className="mr-2 h-4 w-4" /> Ir a vehículos
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permisos</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate('/permisos')}>
              <FileText className="mr-2 h-4 w-4" /> Ir a permisos
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate('/historial')}>
              <History className="mr-2 h-4 w-4" /> Ver historial
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function ChoferDashboard() {
  const navigate = useNavigate()
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Panel chofer</h1>
      <p className="text-muted-foreground mb-6">Tus permisos y actividad</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mis permisos</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate('/permisos')}>
              <FileText className="mr-2 h-4 w-4" /> Ver permisos
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate('/historial')}>
              <History className="mr-2 h-4 w-4" /> Ver historial
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
