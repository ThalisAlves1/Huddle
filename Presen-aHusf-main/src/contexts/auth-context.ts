import {
  createContext,
} from 'react'

import type {
  Session,
  User,
} from '@supabase/supabase-js'

export interface AuthContextData {
  session: Session | null
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

export const AuthContext =
  createContext<AuthContextData | undefined>(
    undefined
  )
