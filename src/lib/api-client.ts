import axios, { AxiosInstance, AxiosError } from 'axios'

const JAVA_API_URL = (
  import.meta.env.VITE_JAVA_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8081/api'
).replace(/\/+$/, '')

const javaClient: AxiosInstance = axios.create({
  baseURL: JAVA_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

javaClient.interceptors.request.use((config) => {
  if (config.url?.startsWith('/')) {
    config.url = config.url.substring(1)
  }
  if (config.baseURL && !config.baseURL.endsWith('/')) {
    config.baseURL += '/'
  }
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    config.headers['X-Auth-Token'] = token
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

javaClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN'
    const url = error.config?.url || 'unknown-url'
    const status = error.response?.status || 'NO_STATUS'
    const payload = error.response?.data
    console.error(`[API ERROR] ${method} ${url} -> ${status}`, payload || error.message)

    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

class APIClient {
  private token: string | null = null

  constructor() {
    this.token = localStorage.getItem('auth_token')
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('auth_token', token)
    javaClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
    javaClient.defaults.headers.common['X-Auth-Token'] = token
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('auth_token')
    delete javaClient.defaults.headers.common['Authorization']
    delete javaClient.defaults.headers.common['X-Auth-Token']
  }

  getToken() {
    return this.token || localStorage.getItem('auth_token')
  }

  async login(email: string, password: string) {
    const response = await javaClient.post('/auth/login.php', { email, password })
    return response.data
  }

  async logout() {
    try {
      const response = await javaClient.post('/auth/logout.php')
      return response.data
    } finally {
      this.clearToken()
    }
  }

  async verifyToken() {
    const response = await javaClient.post('/auth/verify-token.php')
    return response.data
  }

  async createUser(data: any) {
    const response = await javaClient.post('/users/create.php', data)
    return response.data
  }

  async listUsers(params: any = {}) {
    const response = await javaClient.get('/users/list.php', { params })
    return response.data
  }

  async updateUser(data: any) {
    const response = await javaClient.post('/users/update.php', data)
    return response.data
  }

  async verifyTUC(searchType: 'placa' | 'dni' | 'permiso', searchQuery: string) {
    const response = await javaClient.post('/verifications/create.php', {
      search_type: searchType,
      search_query: searchQuery,
    })
    return response.data
  }

  async listVerifications(params: any = {}) {
    const response = await javaClient.get('/verifications/list.php', { params })
    return response.data
  }

  async createCompany(data: any) {
    const response = await javaClient.post('/companies/create.php', data)
    return response.data
  }

  async listCompanies(params: any = {}) {
    const response = await javaClient.get('/companies/list.php', { params })
    return response.data
  }

  async getCompany(id: number) {
    const response = await javaClient.get('/companies/get.php', { params: { id } })
    return response.data
  }

  async updateCompany(data: any) {
    const response = await javaClient.put('/companies/update.php', data)
    return response.data
  }

  async toggleCompanyStatus(id: number) {
    const response = await javaClient.put('/companies/toggle-status.php', { id })
    return response.data
  }

  async createDriver(data: any) {
    const response = await javaClient.post('/drivers/create.php', data)
    return response.data
  }

  async listDrivers(params: any = {}) {
    const response = await javaClient.get('/drivers/list.php', { params })
    return response.data
  }

  async updateDriver(data: any) {
    const response = await javaClient.post('/drivers/update.php', data)
    return response.data
  }

  async createVehicle(data: Record<string, any>, images?: File[]) {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, String(value))
      }
    })
    if (images && images.length > 0) {
      images.forEach((file) => formData.append('images[]', file))
    }
    const response = await javaClient.post('/vehicles/create.php', formData)
    return response.data
  }

  async listVehicles(params: any = {}) {
    const response = await javaClient.get('/vehicles/list.php', { params })
    return response.data
  }

  async updateVehicle(data: any) {
    const response = await javaClient.post('/vehicles/update.php', data)
    return response.data
  }

  async toggleVehicleStatus(id: number) {
    const response = await javaClient.put('/vehicles/toggle-status.php', { id })
    return response.data
  }

  async uploadVehicleImages(vehicleId: number, files: File[]) {
    const formData = new FormData()
    formData.append('vehicle_id', String(vehicleId))
    files.forEach((file) => {
      formData.append('images[]', file)
    })

    const response = await javaClient.post('/vehicles/upload-images.php', formData)
    return response.data
  }

  async exportCompanies(params: any = {}) {
    const response = await javaClient.get('/companies/export.php', { params })
    return response.data
  }

  async exportPermits(params: any = {}) {
    const response = await javaClient.get('/permits/export.php', { params })
    return response.data
  }

  async exportVehicles(params: any = {}) {
    const response = await javaClient.get('/vehicles/export.php', { params })
    return response.data
  }

  async exportDrivers(params: any = {}) {
    const response = await javaClient.get('/drivers/export.php', { params })
    return response.data
  }

  async createAssignment(data: any) {
    const response = await javaClient.post('/assignments', data)
    return response.data
  }

  async listAssignments(params: any = {}) {
    const response = await javaClient.get('/assignments', { params })
    return response.data
  }

  async unassignVehicle(vehicleId: number) {
    const response = await javaClient.delete(`/assignments/vehicle/${vehicleId}`)
    return response.data
  }

  async getVehicleHistory(vehicleId: number) {
    const response = await javaClient.get(`/assignments/history/vehicle/${vehicleId}`)
    return response.data
  }

  async validateCirculation(params: { placa?: string; dni?: string; numero_permiso?: string }) {
    const response = await javaClient.get('/assignments/validate', { params })
    return response.data
  }

  async generatePermit(data: any) {
    const response = await javaClient.post('/permits', data)
    return response.data
  }

  async listPermits(params: any = {}) {
    const response = await javaClient.get('/permits', { params })
    return response.data
  }

  async getPermit(id: number) {
    const response = await javaClient.get(`/permits/${id}`)
    return response.data
  }

  async revokePermit(id: number, motivo: string) {
    const response = await javaClient.put(`/permits/${id}/revoke`, { motivo })
    return response.data
  }

  async renewPermit(id: number, data: any) {
    const response = await javaClient.post(`/permits/${id}/renew`, data)
    return response.data
  }

  async verifyPermit(data: any) {
    const response = await javaClient.post('/permits/verify', data)
    return response.data
  }

  async getVehicleImages(vehicleId: number): Promise<{ url: string; sort_order: number }[]> {
    const response = await javaClient.get(`/permits/vehicle-images/${vehicleId}`)
    return response.data?.data ?? []
  }

  async listLogs(params: any = {}) {
    const response = await javaClient.get('/logs/list.php', { params })
    return response.data
  }

  async getDashboardStats() {
    const response = await javaClient.get('/stats/dashboard')
    return response.data
  }

  async getCompanyStats() {
    const response = await javaClient.get('/stats/companies')
    return response.data
  }

  async getAnalyticsHistory() {
    const response = await javaClient.get('/stats/analytics')
    return response.data
  }
}

export const apiClient = new APIClient()
