import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import type {
  Session,
} from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [session, setSession] =
    useState<Session | null>(null)

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(error => {
        console.warn('Não foi possível recuperar a sessão:', error)
        setSession(null)
      })
      .finally(() => setLoading(false))

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, currentSession) => {
          setSession(currentSession)
          setLoading(false)
        }
      )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
