'use client'
import { useState } from 'react'
import { supabase } from '../supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function doLogin() {
    setError('')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }
    window.location.href = '/dashboard'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#3B2A1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#FAF7F2', borderRadius: 16, padding: '2.5rem',
        width: 380, maxWidth: '92vw', boxShadow: '0 24px 80px rgba(0,0,0,0.4)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, color: '#3B2A1A' }}>
            Creación de <em style={{ color: '#C8922A' }}>Roble</em>
          </h1>
          <p style={{ fontSize: 12, color: '#7A6A55', letterSpacing: 2, textTransform: 'uppercase', marginTop: 6 }}>
            Sistema de gestión
          </p>
        </div>

        <label style={{ fontSize: 12, color: '#7A6A55', display: 'block', marginBottom: 4 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          placeholder="usuario@email.com"
          style={{
            width: '100%', padding: '10px 12px', border: '1px solid rgba(59,42,26,0.28)',
            borderRadius: 10, fontSize: 14, background: '#F2EDE4',
            color: '#1A1108', outline: 'none', marginBottom: 12, boxSizing: 'border-box'
          }}
        />

        <label style={{ fontSize: 12, color: '#7A6A55', display: 'block', marginBottom: 4 }}>Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          placeholder="••••••••"
          style={{
            width: '100%', padding: '10px 12px', border: '1px solid rgba(59,42,26,0.28)',
            borderRadius: 10, fontSize: 14, background: '#F2EDE4',
            color: '#1A1108', outline: 'none', marginBottom: 12, boxSizing: 'border-box'
          }}
        />

        <button
          onClick={doLogin}
          disabled={loading}
          style={{
            width: '100%', padding: 11, background: '#3B2A1A', color: '#FAF7F2',
            border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', marginTop: 4
          }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        {error && <p style={{ fontSize: 12, color: '#c0392b', textAlign: 'center', marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  )
}