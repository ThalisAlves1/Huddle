import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({
  children,
}: {
  children: ReactNode
}) {
  const {
    user,
    loading,
  } = useAuth()

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return children
}
