import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'
import { AuthUser } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('auth_user')

    if (!token || !userStr) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const parsed = JSON.parse(userStr) as Partial<AuthUser>
      const hydrated: AuthUser = {
        id: Number(parsed.id),
        email: String(parsed.email ?? ''),
        nombre: String(parsed.nombre ?? ''),
        role: (parsed.role as AuthUser['role']) ?? 'empresa',
        token: String((parsed as any).token ?? token),
      }
      apiClient.setToken(token)
      setUser(hydrated)
    } catch {

      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      setUser(null)
    }

    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)

      const response = await apiClient.login(email, password)

      if (response.success) {
        const userData = response.data
        apiClient.setToken(userData.token)
        localStorage.setItem('auth_user', JSON.stringify(userData))
        setUser(userData)
        return userData
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error en login'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setLoading(true)
      await apiClient.logout()
      localStorage.removeItem('auth_user')
      setUser(null)
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error en logout'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const verifyToken = useCallback(async () => {
    if (!localStorage.getItem('auth_token')) {
      return false
    }

    try {
      const response = await apiClient.verifyToken()
      return response.success
    } catch {
      return false
    }
  }, [])

  return {
    user,
    loading,
    error,
    login,
    logout,
    verifyToken,
    isAuthenticated: !!user,
  }
}
