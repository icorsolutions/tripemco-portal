import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)

  async function fetchProfile(u) {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', u.id)
        .maybeSingle()
      if (!data) {
        const p = { id: u.id, email: u.email, full_name: u.user_metadata?.full_name || '', role: 'customer' }
        await supabase.from('users').upsert(p)
        setProfile(p)
      } else {
        setProfile(data)
      }
    } catch (e) {
      // Fallback to auth metadata if DB fails
      setProfile({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || '',
        role: 'customer'
      })
    }
  }

  useEffect(() => {
    // Hard timeout - never spin more than 5 seconds
    const timeout = setTimeout(() => setReady(true), 5000)

    async function boot() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user)
        }
      } catch (e) {
        console.warn('Auth boot error:', e)
      } finally {
        clearTimeout(timeout)
        setReady(true)
      }
    }

    boot()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        await fetchProfile(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setUser(data.user)
    await fetchProfile(data.user)
    return data
  }

  const signUp = async (email, password, name, phone) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    })
    if (error) throw error
    if (data.user) {
      const p = { id: data.user.id, email, full_name: name, phone, role: 'customer' }
      await supabase.from('users').upsert(p)
      setUser(data.user)
      setProfile(p)
    }
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <Ctx.Provider value={{ user, profile, ready, isAdmin, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
