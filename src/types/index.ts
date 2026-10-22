export type UserRole = 'admin' | 'operador' | 'fiscalizador'

export interface User {
  id: number
  email: string
  nombre: string
  role: UserRole
  estado: 'activo' | 'inactivo'
  is_active?: number
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: number
  email: string
  nombre: string
  role: UserRole
  token: string
}

export interface Verification {
  id: number
  search_type: 'placa' | 'dni' | 'permiso'
  search_query: string
  resultado: 'autorizado' | 'rechazado'
  motivos: string[]
  vehicle_data: Record<string, any> | null
  ip_address: string
  created_at: string
  verificador_nombre: string
  verificador_role: string
}

export interface Company {
  id: number
  nombre: string
  ruc: string
  telefono: string
  email: string
  direccion: string
  contacto: string
  estado: 'activo' | 'inactivo'
  flota?: number
  created_at: string
  updated_at: string
}

export interface Driver {
  id: number
  user_id: number | null
  company_id: number | null
  nombre_completo: string
  dni: string
  telefono: string
  numero_licencia: string
  fecha_vencimiento_licencia: string
  estado: 'activo' | 'inactivo' | 'suspendido'
  company_nombre: string | null
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: number
  company_id: number | null
  tipo_propiedad: 'empresa' | 'particular'
  tipo_servicio: string | null
  categoria: string
  placa: string
  marca: string
  modelo: string
  color: string
  ano_fabricacion: number | null
  numero_vin?: string
  numero_motor?: string
  combustible?: string
  soat_poliza?: string
  soat_aseguradora?: string
  soat_vencimiento?: string
  rt_entidad?: string
  rt_certificado?: string
  rt_vencimiento?: string
  estado: 'activo' | 'inactivo'
  company_nombre: string | null

  assignment_id?: number | null
  driver_nombre?: string | null
  driver_licencia?: string | null
  driver_estado?: string | null
  assignment_tipo?: string | null

  images_count?: number
  primary_image?: string | null
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: number
  vehicle_id: number
  driver_id: number
  tipo: 'propietario' | 'alquiler' | 'reemplazo_temporal'
  propietario_nombre: string | null
  propietario_dni: string | null
  fecha_inicio: string
  fecha_fin: string | null
  activo: number
  notas: string | null
  created_by: number | null
  created_at: string
  updated_at: string

  nombre_completo?: string
  dni?: string
  numero_licencia?: string
  fecha_vencimiento_licencia?: string
  estado_conductor?: string
  placa?: string
  marca?: string
  modelo?: string
  color?: string
  estado_vehiculo?: string
  empresa?: string
}

export interface Permit {
  id: number
  assignment_id: number
  vehicle_id: number
  driver_id: number
  company_id: number | null
  numero_permiso: string
  fecha_emision: string
  fecha_vencimiento: string
  tipo_permiso: 'libre_transito' | 'ruta_fija' | 'carga' | 'especial'
  observaciones?: string
  qr_code: string | null
  estado: 'vigente' | 'vencido' | 'suspendido' | 'revocado' | 'renovado'
  numero_recibo: string | null
  monto_pagado: number | null
  created_by: number
  nombre_completo: string | null
  dni: string | null
  numero_licencia?: string | null
  fecha_vencimiento_licencia?: string | null
  categoria?: string | null
  placa: string
  marca: string
  modelo: string
  company_nombre: string | null
  empresa: string | null
  created_at: string
  updated_at: string
  verificado?: boolean
  razon?: string
  estado_permiso?: string
  permiso_vence?: string
}

export interface ActionLog {
  id: number
  user_id: number
  accion: string
  entidad: string
  entidad_id: number | null
  descripcion: string | null
  ip_address: string | null
  usuario_nombre: string
  email: string
  created_at: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: {
    data: T[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
  message: string | null
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string | null
}
