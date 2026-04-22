import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext({ user: null, profile: null, loading: true, isAdmin: false })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Absolute fallback — stop loading after 5 seconds no matter what
    const fallback = window.setTimeout(() => setLoading(false), 5000)

    supabase.auth.getSession().then(function(result) {
      var session = result.data && result.data.session
      if (session && session.user) {
        setUser(session.user)
        supabase.from('users').select('*').eq('id', session.user.id).maybeSingle().then(function(r) {
          if (r.data) setProfile(r.data)
          else setProfile({ id: session.user.id, email: session.user.email, full_name: session.user.user_metadata && session.user.user_metadata.full_name || '', role: 'customer' })
          window.clearTimeout(fallback)
          setLoading(false)
        }).catch(function() {
          setProfile({ id: session.user.id, email: session.user.email, role: 'customer' })
          window.clearTimeout(fallback)
          setLoading(false)
        })
      } else {
        window.clearTimeout(fallback)
        setLoading(false)
      }
    }).catch(function() {
      window.clearTimeout(fallback)
      setLoading(false)
    })

    var listener = supabase.auth.onAuthStateChange(function(event, session) {
      if (event === 'SIGNED_OUT') { setUser(null); setProfile(null) }
    })

    return function() {
      window.clearTimeout(fallback)
      listener.data.subscription.unsubscribe()
    }
  }, [])

  function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email: email, password: password }).then(function(r) {
      if (r.error) throw r.error
      setUser(r.data.user)
      return supabase.from('users').select('*').eq('id', r.data.user.id).maybeSingle().then(function(pr) {
        setProfile(pr.data || { id: r.data.user.id, email: email, role: 'customer' })
        return r.data
      })
    })
  }

  function signUp(email, password, name, phone) {
    return supabase.auth.signUp({ email: email, password: password, options: { data: { full_name: name } } }).then(function(r) {
      if (r.error) throw r.error
      if (r.data.user) {
        var p = { id: r.data.user.id, email: email, full_name: name, phone: phone, role: 'customer' }
        supabase.from('users').upsert(p)
        setUser(r.data.user)
        setProfile(p)
      }
      return r.data
    })
  }

  function signOut() {
    return supabase.auth.signOut().then(function() {
      setUser(null)
      setProfile(null)
    })
  }

  return (
    <Ctx.Provider value={{
      user: user,
      profile: profile,
      loading: loading,
      isAdmin: profile && profile.role === 'admin',
      signIn: signIn,
      signUp: signUp,
      signOut: signOut
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() { return useContext(Ctx) }
