import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)

  async function fetchProfile(u) {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', u.id)
        .maybeSingle()
      // If no row exists, create one with default customer role
      if (!data) {
        const newProfile = {
          id: u.id,
          email: u.email,
          full_name: u.user_metadata?.full_name || '',
          role: 'customer'
        }
        await supabase.from('users').upsert(newProfile)
        setProfile(newProfile)
      } else {
        setProfile(data)
      }
    } catch (e) {
      // If table query fails entirely, use auth metadata
      console.warn('Profile fetch failed, using auth metadata', e)
      setProfile({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || '',
        role: u.user_metadata?.role || 'customer'
      })
    } finally {
      setProfileLoaded(true)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        await fetchProfile(u)
      } else {
        setProfileLoaded(true)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        await fetchProfile(u)
      } else {
        setProfile(null)
        setProfileLoaded(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email, password, name, phone) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    })
    if (error) throw error
    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id, email, full_name: name, phone, role: 'customer'
      })
    }
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setProfileLoaded(false)
  }

  const isAdmin = profile?.role === 'admin'
  const ready = !loading && profileLoaded

  return (
    <Ctx.Provider value={{ user, profile, loading, ready, isAdmin, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
