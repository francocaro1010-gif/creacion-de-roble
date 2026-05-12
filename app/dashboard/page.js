'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/'
        return
      }
      setUser(session.user)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single()
      console.log('perfil:', data, 'error:', error)
      setProfile(data)
      setLoading(false)
    }
    getUser()
  }, [])

  async function doLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#3B2A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#FAF7F2', fontFamily: 'Georgia, serif', fontSize: 20 }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2' }}>
      <div style={{
        background: '#3B2A1A', padding: '0 2rem', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#FAF7F2' }}>
          Creación de <em style={{ color: '#E8B04A' }}>Roble</em>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(250,247,242,0.65)' }}>{profile?.name}</span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 99,
            background: 'rgba(200,146,42,0.25)', color: '#E8B04A',
            border: '1px solid rgba(200,146,42,0.4)', textTransform: 'uppercase'
          }}>{profile?.role}</span>
          <button onClick={doLogout} style={{
            background: 'none', border: '1px solid rgba(250,247,242,0.2)',
            color: 'rgba(250,247,242,0.7)', padding: '5px 12px', borderRadius: 99,
            fontSize: 12, cursor: 'pointer'
          }}>Salir</button>
        </div>
      </div>
      <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#3B2A1A' }}>
          Bienvenido, {profile?.name} 👋
        </h2>
        <p style={{ color: '#7A6A55', marginTop: 8 }}>El dashboard completo viene en el siguiente paso.</p>
      </div>
    </div>
  )
}