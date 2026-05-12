'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [updates, setUpdates] = useState([])
  const [activeTab, setActiveTab] = useState('clientes')
  const [adminFilter, setAdminFilter] = useState('all')
  const [colabFilter, setColabFilter] = useState('all')
  const [viewerFilter, setViewerFilter] = useState('all')

  const [modalCliente, setModalCliente] = useState(false)
  const [modalTarea, setModalTarea] = useState(false)
  const [modalUsuario, setModalUsuario] = useState(false)
  const [modalUpdate, setModalUpdate] = useState(false)
  const [modalUpdates, setModalUpdates] = useState(false)
  const [editingCliente, setEditingCliente] = useState(null)
  const [editingTarea, setEditingTarea] = useState(null)
  const [updatingTask, setUpdatingTask] = useState(null)
  const [viewingUpdates, setViewingUpdates] = useState(null)

  const [formCliente, setFormCliente] = useState({ name: '', desc: '' })
  const [formTarea, setFormTarea] = useState({ title: '', desc: '', client_id: '', cat: '', pri: 'med', date: '', assigned_to: '' })
  const [formUsuario, setFormUsuario] = useState({ name: '', email: '', password: '', role: 'colab', client_id: '' })
  const [formUpdate, setFormUpdate] = useState({ status: 'todo', progress: 0, note: '' })

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      const { data: prof } = await supabase.from('users').select('*').eq('email', session.user.email).single()
      setProfile(prof)
      await loadData()
      setLoading(false)
    }
    init()
  }, [])

  async function loadData() {
    const [c, t, u, upd] = await Promise.all([
      supabase.from('clients').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('users').select('*'),
      supabase.from('updates').select('*'),
    ])
    setClients(c.data || [])
    setTasks(t.data || [])
    setUsers(u.data || [])
    setUpdates(upd.data || [])
  }

  async function doLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function statusLabel(s) { return { todo: 'Pendiente', progress: 'En progreso', done: 'Completada', blocked: 'Bloqueada' }[s] || s }
  function clientProgress(clientId) {
    const ts = tasks.filter(t => t.client_id == clientId)
    if (!ts.length) return 0
    return Math.round(ts.reduce((a, t) => a + (t.progress || 0), 0) / ts.length)
  }
  function fmtDate(d) {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    const mn = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return parseInt(day) + ' ' + mn[parseInt(m) - 1]
  }

  async function saveCliente() {
    if (!formCliente.name) return notify('El nombre es obligatorio', 'error')
    if (editingCliente) {
      await supabase.from('clients').update({ name: formCliente.name, desc: formCliente.desc }).eq('id', editingCliente.id)
    } else {
      await supabase.from('clients').insert({ name: formCliente.name, desc: formCliente.desc })
    }
    setModalCliente(false); setEditingCliente(null); setFormCliente({ name: '', desc: '' })
    await loadData(); notify('Cliente guardado ✓')
  }

  async function deleteCliente(id) {
    if (!confirm('¿Eliminar este cliente y todas sus tareas?')) return
    const clientTasks = tasks.filter(t => t.client_id == id)
    for (const t of clientTasks) {
      await supabase.from('updates').delete().eq('task_id', t.id)
      await supabase.from('tasks').delete().eq('id', t.id)
    }
    await supabase.from('clients').delete().eq('id', id)
    await loadData(); notify('Cliente eliminado')
  }

  async function saveTarea() {
    if (!formTarea.title) return notify('El título es obligatorio', 'error')
    if (!formTarea.client_id) return notify('Seleccioná un cliente', 'error')
    if (editingTarea) {
      let status = formTarea.status
      if (parseInt(formTarea.progress) === 100) status = 'done'
      await supabase.from('tasks').update({ ...formTarea, status, progress: parseInt(formTarea.progress) }).eq('id', editingTarea.id)
    } else {
      await supabase.from('tasks').insert({ ...formTarea, status: 'todo', progress: 0 })
    }
    setModalTarea(false); setEditingTarea(null)
    setFormTarea({ title: '', desc: '', client_id: '', cat: '', pri: 'med', date: '', assigned_to: '' })
    await loadData(); notify('Tarea guardada ✓')
  }

  async function deleteTarea(id) {
    if (!confirm('¿Eliminar esta tarea?')) return
    await supabase.from('updates').delete().eq('task_id', id)
    await supabase.from('tasks').delete().eq('id', id)
    await loadData(); notify('Tarea eliminada')
  }

  async function saveUsuario() {
    if (!formUsuario.name || !formUsuario.email || !formUsuario.password) return notify('Completá todos los campos', 'error')
    if (formUsuario.password.length < 6) return notify('La contraseña debe tener al menos 6 caracteres', 'error')
    const { data, error } = await supabase.auth.signUp({ email: formUsuario.email, password: formUsuario.password })
    if (error) return notify('Error: ' + error.message, 'error')
    await supabase.from('users').insert({
      id: data.user.id, name: formUsuario.name, email: formUsuario.email,
      role: formUsuario.role, client_id: formUsuario.client_id || null
    })
    setModalUsuario(false)
    setFormUsuario({ name: '', email: '', password: '', role: 'colab', client_id: '' })
    await loadData(); notify('Usuario creado ✓')
  }

  async function deleteUser(id) {
    if (!confirm('¿Eliminar este usuario?')) return
    await supabase.from('users').delete().eq('id', id)
    await loadData(); notify('Usuario eliminado')
  }

  async function saveUpdate() {
    let status = formUpdate.status
    if (parseInt(formUpdate.progress) === 100) status = 'done'
    await supabase.from('tasks').update({ status, progress: parseInt(formUpdate.progress) }).eq('id', updatingTask.id)
    if (formUpdate.note) {
      await supabase.from('updates').insert({
        task_id: updatingTask.id, user_id: profile.id,
        note: formUpdate.note, status, progress: parseInt(formUpdate.progress)
      })
    }
    setModalUpdate(false); setUpdatingTask(null)
    await loadData(); notify('Progreso actualizado ✓')
  }

  function notify(msg, type = 'success') {
    const n = document.getElementById('notif')
    if (!n) return
    n.textContent = msg
    n.style.background = type === 'error' ? '#c0392b' : '#3B2A1A'
    n.style.transform = 'translateY(0)'
    n.style.opacity = '1'
    setTimeout(() => { n.style.transform = 'translateY(100px)'; n.style.opacity = '0' }, 3000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#3B2A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#FAF7F2', fontFamily: 'Georgia, serif', fontSize: 20 }}>Cargando...</p>
    </div>
  )

  const roleMap = { admin: 'Administrador', colab: 'Colaborador', viewer: 'Visualizador' }
  const roleColors = { admin: { bg: 'rgba(200,146,42,0.25)', color: '#E8B04A', border: 'rgba(200,146,42,0.4)' }, colab: { bg: 'rgba(45,90,61,0.3)', color: '#A8D5B5', border: 'rgba(45,90,61,0.5)' }, viewer: { bg: 'rgba(250,247,242,0.1)', color: 'rgba(250,247,242,0.6)', border: 'rgba(250,247,242,0.2)' } }
  const rc = roleColors[profile?.role] || roleColors.viewer

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: 'DM Sans, sans-serif' }}>

      <div style={{ background: '#3B2A1A', padding: '0 2rem', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#FAF7F2', margin: 0 }}>Creación de <em style={{ color: '#E8B04A' }}>Roble</em></h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(250,247,242,0.65)' }}>{profile?.name}</span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, textTransform: 'uppercase', fontWeight: 500 }}>{roleMap[profile?.role]}</span>
          <button onClick={doLogout} style={{ background: 'none', border: '1px solid rgba(250,247,242,0.2)', color: 'rgba(250,247,242,0.7)', padding: '5px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer' }}>Salir</button>
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>

        {profile?.role === 'admin' && (
          <div>
            <div style={{ display: 'flex', gap: 4, marginBottom: '2rem', background: '#F2EDE4', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid rgba(59,42,26,0.15)' }}>
              {[['clientes', '🏢 Clientes'], ['tareas', '✅ Tareas'], ['usuarios', '👥 Usuarios']].map(([key, label]) => (
                <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '7px 18px', borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', background: activeTab === key ? '#3B2A1A' : 'transparent', color: activeTab === key ? '#FAF7F2' : '#7A6A55', fontWeight: activeTab === key ? 500 : 400 }}>{label}</button>
              ))}
            </div>

            {activeTab === 'clientes' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div><h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#3B2A1A', margin: 0 }}>Clientes</h2><p style={{ fontSize: 12, color: '#7A6A55', marginTop: 2 }}>Gestioná las marcas y sus avances</p></div>
                  <button onClick={() => { setEditingCliente(null); setFormCliente({ name: '', desc: '' }); setModalCliente(true) }} style={btnOak}>+ Nuevo cliente</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
                  {clients.length === 0 && <p style={{ color: '#7A6A55' }}>No hay clientes aún.</p>}
                  {clients.map(c => {
                    const pct = clientProgress(c.id)
                    const cTasks = tasks.filter(t => t.client_id == c.id)
                    const done = cTasks.filter(t => t.status === 'done').length
                    return (
                      <div key={c.id} style={{ background: '#fff', border: '1px solid rgba(59,42,26,0.15)', borderRadius: 16, padding: '1.25rem' }}>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, color: '#3B2A1A' }}>{c.name}</div>
                        {c.desc && <div style={{ fontSize: 12, color: '#7A6A55', marginTop: 4 }}>{c.desc}</div>}
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 700, color: '#2D5A3D', margin: '8px 0 6px' }}>{pct}%</div>
                        <div style={{ height: 5, background: '#E8DFD0', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}><div style={{ height: '100%', background: pct === 100 ? '#2D5A3D' : pct >= 50 ? '#3D7A52' : '#C8922A', width: pct + '%', borderRadius: 99 }} /></div>
                        <div style={{ fontSize: 12, color: '#7A6A55' }}>{cTasks.length} tareas · {done} completadas</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <button onClick={() => { setEditingCliente(c); setFormCliente({ name: c.name, desc: c.desc || '' }); setModalCliente(true) }} style={btnSm}>✏️ Editar</button>
                          <button onClick={() => deleteCliente(c.id)} style={{ ...btnSm, color: '#c0392b' }}>🗑️</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'tareas' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div><h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#3B2A1A', margin: 0 }}>Todas las tareas</h2><p style={{ fontSize: 12, color: '#7A6A55', marginTop: 2 }}>Administrá tareas de todos los clientes</p></div>
                  <button onClick={() => { setEditingTarea(null); setFormTarea({ title: '', desc: '', client_id: '', cat: '', pri: 'med', date: '', assigned_to: '', status: 'todo', progress: 0 }); setModalTarea(true) }} style={btnOak}>+ Nueva tarea</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '2rem' }}>
                  {[
                    { num: tasks.length, label: 'Total tareas', color: '#3B2A1A' },
                    { num: tasks.filter(t => t.status === 'done').length, label: 'Completadas', color: '#2D5A3D' },
                    { num: tasks.filter(t => t.status === 'progress').length, label: 'En progreso', color: '#C8922A' },
                    { num: tasks.length ? Math.round(tasks.reduce((a, t) => a + (t.progress || 0), 0) / tasks.length) + '%' : '0%', label: 'Avance global', color: '#3B2A1A' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid rgba(59,42,26,0.15)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 700, color: s.color }}>{s.num}</div>
                      <div style={{ fontSize: 11, color: '#7A6A55', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.5px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  {[{ v: 'all', l: 'Todos' }, ...clients.map(c => ({ v: String(c.id), l: c.name }))].map(f => (
                    <button key={f.v} onClick={() => setAdminFilter(f.v)} style={{ padding: '5px 14px', borderRadius: 99, fontSize: 12, border: '1px solid rgba(59,42,26,0.28)', cursor: 'pointer', background: adminFilter === f.v ? '#3B2A1A' : 'transparent', color: adminFilter === f.v ? '#FAF7F2' : '#7A6A55' }}>{f.l}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(adminFilter === 'all' ? tasks : tasks.filter(t => t.client_id == adminFilter)).map(t => {
                    const client = clients.find(c => c.id == t.client_id)
                    const assignee = t.assigned_to ? users.find(u => u.id === t.assigned_to) : null
                    const updCount = updates.filter(u => u.task_id === t.id).length
                    return (
                      <div key={t.id} style={{ background: '#fff', border: '1px solid rgba(59,42,26,0.15)', borderRadius: 16, padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: { high: '#C0392B', med: '#E67E22', low: '#27AE60' }[t.pri] || '#E67E22' }} />
                            <span style={{ fontSize: 15, fontWeight: 500, color: '#3B2A1A' }}>{t.title}</span>
                            {t.cat && <span style={{ fontSize: 11, padding: '1px 7px', border: '1px solid rgba(59,42,26,0.15)', borderRadius: 4, color: '#7A6A55' }}>{t.cat}</span>}
                            {client && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 4, background: 'rgba(200,146,42,0.12)', color: '#5C3D1E', border: '1px solid rgba(200,146,42,0.25)', fontWeight: 500 }}>{client.name}</span>}
                          </div>
                          <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, fontWeight: 500, ...badgeStyle(t.status) }}>{statusLabel(t.status)}</span>
                        </div>
                        {t.desc && <p style={{ fontSize: 13, color: '#7A6A55', marginBottom: 10 }}>{t.desc}</p>}
                        <div style={{ height: 5, background: '#E8DFD0', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', background: t.progress === 100 ? '#2D5A3D' : t.progress >= 50 ? '#3D7A52' : '#C8922A', width: (t.progress || 0) + '%', borderRadius: 99 }} /></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
                          <span style={{ fontSize: 11, color: '#7A6A55', fontFamily: 'monospace' }}>{t.progress || 0}%{assignee ? ' · ' + assignee.name : ''}{t.date ? ' · ' + fmtDate(t.date) : ''}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {updCount > 0 && <button onClick={() => { setViewingUpdates(t); setModalUpdates(true) }} style={btnSm}>💬 {updCount}</button>}
                            <button onClick={() => { setEditingTarea(t); setFormTarea({ title: t.title, desc: t.desc || '', client_id: t.client_id, cat: t.cat || '', pri: t.pri, date: t.date || '', assigned_to: t.assigned_to || '', status: t.status, progress: t.progress || 0 }); setModalTarea(true) }} style={btnSm}>✏️</button>
                            <button onClick={() => deleteTarea(t.id)} style={{ ...btnSm, color: '#c0392b' }}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {tasks.length === 0 && <p style={{ color: '#7A6A55', textAlign: 'center', padding: '3rem' }}>No hay tareas aún.</p>}
                </div>
              </div>
            )}

            {activeTab === 'usuarios' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div><h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#3B2A1A', margin: 0 }}>Usuarios</h2><p style={{ fontSize: 12, color: '#7A6A55', marginTop: 2 }}>Colaboradores y visualizadores por cliente</p></div>
                  <button onClick={() => setModalUsuario(true)} style={btnOak}>+ Nuevo usuario</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {users.filter(u => u.role !== 'admin').map(u => {
                    const client = u.client_id ? clients.find(c => c.id == u.client_id) : null
                    const rc2 = roleColors[u.role] || roleColors.viewer
                    return (
                      <div key={u.id} style={{ background: '#fff', border: '1px solid rgba(59,42,26,0.15)', borderRadius: 16, padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15, fontWeight: 500, color: '#3B2A1A' }}>{u.name}</span>
                            <span style={{ fontSize: 11, padding: '1px 7px', border: '1px solid rgba(59,42,26,0.15)', borderRadius: 4, color: '#7A6A55', fontFamily: 'monospace' }}>{u.email}</span>
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: rc2.bg, color: rc2.color, border: `1px solid ${rc2.border}`, textTransform: 'uppercase', fontWeight: 500 }}>{roleMap[u.role]}</span>
                            {client ? <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 4, background: 'rgba(200,146,42,0.12)', color: '#5C3D1E', border: '1px solid rgba(200,146,42,0.25)', fontWeight: 500 }}>{client.name}</span> : <span style={{ fontSize: 11, padding: '1px 7px', border: '1px solid rgba(59,42,26,0.15)', borderRadius: 4, color: '#7A6A55' }}>Todos</span>}
                          </div>
                          <button onClick={() => deleteUser(u.id)} style={{ ...btnSm, color: '#c0392b' }}>🗑️</button>
                        </div>
                      </div>
                    )
                  })}
                  {users.filter(u => u.role !== 'admin').length === 0 && <p style={{ color: '#7A6A55', textAlign: 'center', padding: '3rem' }}>No hay usuarios aún.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {profile?.role === 'colab' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#3B2A1A', margin: 0 }}>Mis tareas</h2>
              <p style={{ fontSize: 12, color: '#7A6A55', marginTop: 2 }}>Actualizá el estado y progreso de tus tareas</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {[{ v: 'all', l: 'Todas' }, { v: 'todo', l: 'Pendientes' }, { v: 'progress', l: 'En progreso' }, { v: 'done', l: 'Completadas' }, { v: 'blocked', l: 'Bloqueadas' }].map(f => (
                <button key={f.v} onClick={() => setColabFilter(f.v)} style={{ padding: '5px 14px', borderRadius: 99, fontSize: 12, border: '1px solid rgba(59,42,26,0.28)', cursor: 'pointer', background: colabFilter === f.v ? '#3B2A1A' : 'transparent', color: colabFilter === f.v ? '#FAF7F2' : '#7A6A55' }}>{f.l}</button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.filter(t => {
                if (profile.client_id && t.client_id != profile.client_id) return false
                if (colabFilter !== 'all' && t.status !== colabFilter) return false
                return true
              }).map(t => {
                const mine = t.assigned_to === profile.id
                const updCount = updates.filter(u => u.task_id === t.id).length
                return (
                  <div key={t.id} style={{ background: '#fff', border: `1px solid ${mine ? '#2D5A3D' : 'rgba(59,42,26,0.15)'}`, borderLeft: mine ? '3px solid #2D5A3D' : undefined, borderRadius: 16, padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: { high: '#C0392B', med: '#E67E22', low: '#27AE60' }[t.pri] || '#E67E22' }} />
                        <span style={{ fontSize: 15, fontWeight: 500, color: '#3B2A1A' }}>{t.title}</span>
                        {t.cat && <span style={{ fontSize: 11, padding: '1px 7px', border: '1px solid rgba(59,42,26,0.15)', borderRadius: 4, color: '#7A6A55' }}>{t.cat}</span>}
                        {mine && <span style={{ fontSize: 11, padding: '1px 7px', border: '1px solid #A8D5B5', borderRadius: 4, color: '#2D5A3D' }}>Asignada a mí</span>}
                      </div>
                      <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, fontWeight: 500, ...badgeStyle(t.status) }}>{statusLabel(t.status)}</span>
                    </div>
                    {t.desc && <p style={{ fontSize: 13, color: '#7A6A55', marginBottom: 10 }}>{t.desc}</p>}
                    <div style={{ height: 5, background: '#E8DFD0', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', background: t.progress === 100 ? '#2D5A3D' : t.progress >= 50 ? '#3D7A52' : '#C8922A', width: (t.progress || 0) + '%', borderRadius: 99 }} /></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                      <span style={{ fontSize: 11, color: '#7A6A55', fontFamily: 'monospace' }}>{t.progress || 0}%{t.date ? ' · Vence ' + fmtDate(t.date) : ''}{updCount ? ' · ' + updCount + ' nota(s)' : ''}</span>
                      <button onClick={() => { setUpdatingTask(t); setFormUpdate({ status: t.status, progress: t.progress || 0, note: '' }); setModalUpdate(true) }} style={{ ...btnSm, background: '#2D5A3D', color: '#fff', border: 'none' }}>✏️ Actualizar</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {profile?.role === 'viewer' && (
          <div>
            <div style={{ background: '#3B2A1A', borderRadius: 16, padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#FAF7F2', margin: 0 }}>{profile.client_id ? clients.find(c => c.id == profile.client_id)?.name || 'Progreso' : 'Progreso general'}</h2>
                <p style={{ fontSize: 13, color: 'rgba(250,247,242,.6)', marginTop: 4 }}>Seguimiento en tiempo real de tus proyectos</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 48, fontWeight: 700, color: '#E8B04A', lineHeight: 1 }}>
                  {tasks.filter(t => !profile.client_id || t.client_id == profile.client_id).length ? Math.round(tasks.filter(t => !profile.client_id || t.client_id == profile.client_id).reduce((a, t) => a + (t.progress || 0), 0) / tasks.filter(t => !profile.client_id || t.client_id == profile.client_id).length) : 0}%
                </div>
                <div style={{ fontSize: 12, color: 'rgba(250,247,242,.5)' }}>completado</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.filter(t => !profile.client_id || t.client_id == profile.client_id).map(t => (
                <div key={t.id} style={{ background: '#fff', border: '1px solid rgba(59,42,26,0.15)', borderRadius: 16, padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: '#3B2A1A' }}>{t.title}</span>
                    <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, fontWeight: 500, ...badgeStyle(t.status) }}>{statusLabel(t.status)}</span>
                  </div>
                  {t.desc && <p style={{ fontSize: 13, color: '#7A6A55', marginBottom: 10 }}>{t.desc}</p>}
                  <div style={{ height: 5, background: '#E8DFD0', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', background: t.progress === 100 ? '#2D5A3D' : t.progress >= 50 ? '#3D7A52' : '#C8922A', width: (t.progress || 0) + '%', borderRadius: 99 }} /></div>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#7A6A55', fontFamily: 'monospace' }}>{t.progress || 0}%{t.date ? ' · Vence ' + fmtDate(t.date) : ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalCliente && (
        <div style={modalBg} onClick={e => e.target === e.currentTarget && setModalCliente(false)}>
          <div style={modalBox}>
            <h3 style={modalTitle}>{editingCliente ? 'Editar cliente' : 'Nuevo cliente'}</h3>
            <label style={flabel}>Nombre *</label>
            <input style={finput} value={formCliente.name} onChange={e => setFormCliente({ ...formCliente, name: e.target.value })} placeholder="Ej: Studio Vela" />
            <label style={flabel}>Descripción</label>
            <textarea style={{ ...finput, minHeight: 56, resize: 'vertical' }} value={formCliente.desc} onChange={e => setFormCliente({ ...formCliente, desc: e.target.value })} placeholder="Giro, notas..." />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setModalCliente(false)} style={btnCancel}>Cancelar</button>
              <button onClick={saveCliente} style={btnOak}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {modalTarea && (
        <div style={modalBg} onClick={e => e.target === e.currentTarget && setModalTarea(false)}>
          <div style={modalBox}>
            <h3 style={modalTitle}>{editingTarea ? 'Editar tarea' : 'Nueva tarea'}</h3>
            <label style={flabel}>Título *</label>
            <input style={finput} value={formTarea.title} onChange={e => setFormTarea({ ...formTarea, title: e.target.value })} placeholder="Ej: Diseñar logotipo" />
            <label style={flabel}>Descripción</label>
            <textarea style={{ ...finput, minHeight: 56, resize: 'vertical' }} value={formTarea.desc} onChange={e => setFormTarea({ ...formTarea, desc: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
              <div>
                <label style={flabel}>Cliente *</label>
                <select style={finput} value={formTarea.client_id} onChange={e => setFormTarea({ ...formTarea, client_id: e.target.value })}>
                  <option value="">Seleccionar</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={flabel}>Categoría</label>
                <input style={finput} value={formTarea.cat} onChange={e => setFormTarea({ ...formTarea, cat: e.target.value })} placeholder="Ej: Diseño" />
              </div>
              <div>
                <label style={flabel}>Prioridad</label>
                <select style={finput} value={formTarea.pri} onChange={e => setFormTarea({ ...formTarea, pri: e.target.value })}>
                  <option value="high">Alta</option>
                  <option value="med">Media</option>
                  <option value="low">Baja</option>
                </select>
              </div>
              <div>
                <label style={flabel}>Fecha límite</label>
                <input style={finput} type="date" value={formTarea.date} onChange={e => setFormTarea({ ...formTarea, date: e.target.value })} />
              </div>
              <div>
                <label style={flabel}>Asignar a</label>
                <select style={finput} value={formTarea.assigned_to} onChange={e => setFormTarea({ ...formTarea, assigned_to: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {users.filter(u => u.role === 'colab').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              {editingTarea && (
                <div>
                  <label style={flabel}>Estado</label>
                  <select style={finput} value={formTarea.status} onChange={e => setFormTarea({ ...formTarea, status: e.target.value })}>
                    <option value="todo">Pendiente</option>
                    <option value="progress">En progreso</option>
                    <option value="done">Completada</option>
                    <option value="blocked">Bloqueada</option>
                  </select>
                </div>
              )}
            </div>
            {editingTarea && (
              <div style={{ marginTop: 12 }}>
                <label style={flabel}>Progreso: {formTarea.progress}%</label>
                <input type="range" min="0" max="100" step="5" value={formTarea.progress} onChange={e => setFormTarea({ ...formTarea, progress: e.target.value })} style={{ width: '100%', accentColor: '#2D5A3D' }} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setModalTarea(false)} style={btnCancel}>Cancelar</button>
              <button onClick={saveTarea} style={btnOak}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {modalUsuario && (
        <div style={modalBg} onClick={e => e.target === e.currentTarget && setModalUsuario(false)}>
          <div style={modalBox}>
            <h3 style={modalTitle}>Nuevo usuario</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={flabel}>Nombre completo *</label>
                <input style={finput} value={formUsuario.name} onChange={e => setFormUsuario({ ...formUsuario, name: e.target.value })} placeholder="Ej: Laura Gómez" />
              </div>
              <div>
                <label style={flabel}>Email *</label>
                <input style={finput} type="email" value={formUsuario.email} onChange={e => setFormUsuario({ ...formUsuario, email: e.target.value })} placeholder="laura@ejemplo.com" />
              </div>
              <div>
                <label style={flabel}>Contraseña *</label>
                <input style={finput} type="password" value={formUsuario.password} onChange={e => setFormUsuario({ ...formUsuario, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label style={flabel}>Rol</label>
                <select style={finput} value={formUsuario.role} onChange={e => setFormUsuario({ ...formUsuario, role: e.target.value })}>
                  <option value="colab">Colaborador</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={flabel}>Cliente asignado</label>
                <select style={finput} value={formUsuario.client_id} onChange={e => setFormUsuario({ ...formUsuario, client_id: e.target.value })}>
                  <option value="">Todos los clientes</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setModalUsuario(false)} style={btnCancel}>Cancelar</button>
              <button onClick={saveUsuario} style={btnOak}>Crear usuario</button>
            </div>
          </div>
        </div>
      )}

      {modalUpdate && updatingTask && (
        <div style={modalBg} onClick={e => e.target === e.currentTarget && setModalUpdate(false)}>
          <div style={modalBox}>
            <h3 style={modalTitle}>Actualizar progreso</h3>
            <p style={{ fontWeight: 500, color: '#3B2A1A', marginBottom: '1rem' }}>{updatingTask.title}</p>
            <label style={flabel}>Estado</label>
            <select style={finput} value={formUpdate.status} onChange={e => setFormUpdate({ ...formUpdate, status: e.target.value })}>
              <option value="todo">Pendiente</option>
              <option value="progress">En progreso</option>
              <option value="done">Completada</option>
              <option value="blocked">Bloqueada</option>
            </select>
            <label style={{ ...flabel, marginTop: 12 }}>Progreso: {formUpdate.progress}%</label>
            <input type="range" min="0" max="100" step="5" value={formUpdate.progress} onChange={e => setFormUpdate({ ...formUpdate, progress: e.target.value })} style={{ width: '100%', accentColor: '#2D5A3D' }} />
            <label style={{ ...flabel, marginTop: 12 }}>Nota / comentario</label>
            <textarea style={{ ...finput, minHeight: 56, resize: 'vertical' }} value={formUpdate.note} onChange={e => setFormUpdate({ ...formUpdate, note: e.target.value })} placeholder="¿Qué avanzaste?" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setModalUpdate(false)} style={btnCancel}>Cancelar</button>
              <button onClick={saveUpdate} style={{ ...btnOak, background: '#2D5A3D', borderColor: '#2D5A3D' }}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {modalUpdates && viewingUpdates && (
        <div style={modalBg} onClick={e => e.target === e.currentTarget && setModalUpdates(false)}>
          <div style={modalBox}>
            <h3 style={modalTitle}>{viewingUpdates.title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {updates.filter(u => u.task_id === viewingUpdates.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((u, i) => {
                const author = users.find(x => x.id === u.user_id)
                return (
                  <div key={i} style={{ background: '#F2EDE4', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid #C8922A' }}>
                    <p style={{ fontSize: 13, color: '#1A1108', lineHeight: 1.5 }}>{u.note}</p>
                    <p style={{ fontSize: 11, color: '#7A6A55', fontFamily: 'monospace', marginTop: 4 }}>{author?.name || '?'} · {u.progress}% · {statusLabel(u.status)}</p>
                  </div>
                )
              })}
              {updates.filter(u => u.task_id === viewingUpdates.id).length === 0 && <p style={{ color: '#7A6A55', fontSize: 13 }}>Sin notas registradas aún.</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setModalUpdates(false)} style={btnOak}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div id="notif" style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: '#3B2A1A', color: '#FAF7F2', padding: '12px 18px', borderRadius: 10, fontSize: 13, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 9999, transform: 'translateY(100px)', opacity: 0, transition: 'all .3s', maxWidth: 300 }} />
    </div>
  )
}

function badgeStyle(s) {
  const styles = {
    todo: { background: '#F1EFE8', color: '#5F5E5A', border: '1px solid #D3D1C7' },
    progress: { background: '#FFF3DC', color: '#7A4800', border: '1px solid #F5D28A' },
    done: { background: '#EAF5EE', color: '#1A5C32', border: '1px solid #A8D5B5' },
    blocked: { background: '#FDF0F0', color: '#8B2020', border: '1px solid #E8B4B4' },
  }
  return styles[s] || styles.todo
}

const btnOak = { padding: '8px 18px', borderRadius: 10, fontSize: 13, cursor: 'pointer', background: '#3B2A1A', color: '#FAF7F2', border: '1px solid #3B2A1A' }
const btnCancel = { padding: '8px 18px', borderRadius: 10, fontSize: 13, cursor: 'pointer', background: 'transparent', color: '#3B2A1A', border: '1px solid rgba(59,42,26,0.28)' }
const btnSm = { padding: '5px 12px', borderRadius: 10, fontSize: 12, cursor: 'pointer', background: 'transparent', color: '#3B2A1A', border: '1px solid rgba(59,42,26,0.28)' }
const modalBg = { position: 'fixed', inset: 0, background: 'rgba(26,17,8,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }
const modalBox = { background: '#FAF7F2', borderRadius: 16, border: '1px solid rgba(59,42,26,0.28)', padding: '2rem', width: 500, maxWidth: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }
const modalTitle = { fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: '#3B2A1A', marginBottom: '1.25rem' }
const flabel = { fontSize: 12, color: '#7A6A55', display: 'block', marginBottom: 4, fontWeight: 500, marginTop: 8 }
const finput = { width: '100%', padding: '9px 11px', border: '1px solid rgba(59,42,26,0.28)', borderRadius: 10, fontSize: 13, background: '#F2EDE4', color: '#1A1108', outline: 'none', boxSizing: 'border-box' }