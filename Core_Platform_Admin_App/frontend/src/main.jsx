import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API = '/api/v1'
const DEMOS = [
  { label: 'Admin', email: 'admin@coreplatform.dev', password: 'admin123' },
  { label: 'Student', email: 'student@coreplatform.dev', password: 'student123' },
  { label: 'Faculty', email: 'faculty@coreplatform.dev', password: 'faculty123' },
  { label: 'Staff · Operator', email: 'staff@coreplatform.dev', password: 'staff123' },
  { label: 'Staff · Viewer', email: 'viewer@coreplatform.dev', password: 'viewer123' },
  { label: 'Applicant', email: 'applicant@coreplatform.dev', password: 'applicant123' },
]
const UNIVERSITY_ROLES = ['Administrator', 'Student', 'Faculty', 'Staff', 'Applicant']
const ACCESS = [
  { title: 'Administrator', detail: 'Full access to console data and user administration.' },
  { title: 'Operator', detail: 'View users, update details, activate and deactivate accounts.' },
  { title: 'Viewer', detail: 'Read-only dashboard and user list.' },
]
const MODULES = {
  Student: [['My Courses', 'LMS Core'], ['Registration & Records', 'SIS'], ['My Timetable', 'Academic Scheduling']],
  Faculty: [['Teaching', 'LMS Core'], ['My Schedule', 'Academic Scheduling'], ['Class Lists', 'SIS']],
  Staff: [['Student Records', 'SIS'], ['Room Booking', 'Academic Scheduling'], ['Admissions Desk', 'Admissions']],
  Applicant: [['Admissions Portal', 'Admissions']],
}

async function api(path, token, options = {}) {
  let response
  try {
    response = await fetch(API + path, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Cannot reach the API. Is the Java backend running?')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(typeof data.detail === 'string' ? data.detail : 'Request failed')
    error.status = response.status
    throw error
  }
  return data
}

function Initials({ name }) {
  return <span className="avatar" aria-hidden="true">{name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>
}

function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

function SignIn({ onLogin }) {
  const [email, setEmail] = useState('admin@coreplatform.dev')
  const [password, setPassword] = useState('admin123')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onLogin(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return <div className="login-page">
    <section className="login-panel">
      <div className="brand brand-light"><div className="brand-symbol">CP</div><div><strong>Core Platform</strong><small>University sign-in</small></div></div>
      <div className="login-content">
        <p className="eyebrow">Secure workspace</p>
        <h1>Sign in to the university platform</h1>
        <p className="muted intro">One account for courses, registration, timetables, admissions and administration.</p>
        <form onSubmit={submit} className="login-form">
          <label>Email address<input autoComplete="username" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label>Password<input autoComplete="current-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="button primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="demo">
          <p>Demo accounts <span className="muted">(select to prefill)</span></p>
          <div className="demo-list">{DEMOS.map(account => <button className="chip" type="button" key={account.email} onClick={() => { setEmail(account.email); setPassword(account.password); setError('') }}>{account.label}</button>)}</div>
        </div>
      </div>
      <p className="login-footer">SDT-213 · Initial application foundation</p>
    </section>
    <aside className="login-illustration"><div className="login-status"><i className="status-dot" />Core Platform API · powered by Spring Boot</div><div className="illustration-title">One platform.<br /><em>Every university role.</em></div><p className="illustration-copy">React + Java implementation</p></aside>
  </div>
}

function Sidebar({ user, page, setPage, signOut, canAccessAdmin }) {
  const isAdmin = user.role === 'Administrator'
  const links = isAdmin ? [
    ['dashboard', '▦', 'Dashboard'], ['users', '◉', 'Users'], ['roles', '◇', 'Roles & Access'],
    ['status', '◈', 'System Status'], ['audit', '≡', 'Activity Log'], ['profile', '◌', 'My Profile'],
  ] : [
    ['home', '⌂', 'Home'], ['profile', '◌', 'My Profile'],
    ...(canAccessAdmin ? [['dashboard', '▦', 'Dashboard'], ['users', '◉', 'Users'], ['roles', '◇', 'Roles & Access'], ['status', '◈', 'System Status']] : []),
  ]
  return <aside className="sidebar">
    <div className="brand brand-dark"><div className="brand-symbol">CP</div><div><strong>Core Platform</strong><small>{canAccessAdmin ? 'University · Console' : 'University Portal'}</small></div></div>
    <nav className="nav" aria-label="Main navigation">{links.map(([id, icon, label]) => <button key={id} onClick={() => setPage(id)} className={`nav-item ${page === id ? 'selected' : ''}`}><span className="nav-icon">{icon}</span>{label}</button>)}</nav>
    <div className="sidebar-footer"><div className="sidebar-user"><Initials name={user.name} /><div><strong>{user.name}</strong><small>{user.console_access ?? user.role}</small></div></div><button className="signout" onClick={signOut}>Sign out →</button></div>
  </aside>
}

function Header({ page, user }) {
  const titles = { dashboard: 'Operational dashboard', users: 'User administration', roles: 'Roles and access', status: 'System status', audit: 'Activity log', home: 'Home', profile: 'My profile' }
  return <header className="page-header"><div><p className="eyebrow">Core Platform / {user.role}</p><h1>{titles[page]}</h1></div><div className="header-end"><span className="header-meta"><i className="status-dot" />Core API</span><Badge>{user.console_access ?? user.role}</Badge></div></header>
}

function Dashboard({ data, error }) {
  if (error) return <ErrorNotice message={error} />
  if (!data) return <p className="muted">Loading dashboard…</p>
  const cards = [
    ['Total users', data.total_users, 'Managed accounts'], ['Active accounts', data.active_accounts, 'Can sign in'],
    ['Administrators', data.administrators, 'Full access'], ['Pending reviews', data.pending_reviews, 'Awaiting activation'],
  ]
  return <>
    <div className="stat-grid">{cards.map(([title, value, desc]) => <article className="card stat-card" key={title}><p className="muted label-sm">{title}</p><strong>{value}</strong><p className="muted">{desc}</p></article>)}</div>
    <div className="two-column"><section className="card"><div className="section-heading"><div><p className="eyebrow">Recent activity</p><h2>Administrative activity</h2></div></div>{data.recent_activity.length ? <div className="activity-list">{data.recent_activity.map(item => <div className="activity-row" key={item.id}><span className="action-check">✓</span><div><strong>{item.action}</strong><small>{item.actor} · {item.target}</small></div><time>{new Date(item.timestamp).toLocaleString()}</time></div>)}</div> : <p className="muted">Audit entries are visible to administrators only.</p>}</section>
    <section className="card"><div className="section-heading"><div><p className="eyebrow">Live services</p><h2>Platform health</h2></div><Badge tone="success">1 / 1 online</Badge></div><div className="health-item"><span><i className="status-dot" />{data.service.name}</span><Badge tone="success">{data.service.status}</Badge></div><p className="muted fineprint">Other university modules are not connected in this starter.</p></section></div>
  </>
}

function ErrorNotice({ message }) { return <p className="error" role="alert">{message}</p> }

function Users({ users, loading, error, filters, setFilters, selected, setSelected, canEdit, isAdmin, onUpdate, onCreate, refreshing }) {
  const [showAdd, setShowAdd] = useState(false)
  return <>
    <div className="section-toolbar"><div><h2>Managed users</h2><p className="muted">Search accounts and manage access status.</p></div>{isAdmin && <button className="button primary" onClick={() => setShowAdd(true)}>+ Add user</button>}</div>
    <div className="filter-row"><label className="sr-only" htmlFor="user-query">Search users</label><input id="user-query" placeholder="Search by name or email" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} /><label className="sr-only" htmlFor="role-filter">Role</label><select id="role-filter" value={filters.role} onChange={e => setFilters({ ...filters, role: e.target.value })}><option value="">All roles</option>{UNIVERSITY_ROLES.map(x => <option key={x}>{x}</option>)}</select><label className="sr-only" htmlFor="status-filter">Status</label><select id="status-filter" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{['Active', 'Pending', 'Inactive'].map(x => <option key={x}>{x}</option>)}</select></div>
    <section className="card table-card">{error ? <ErrorNotice message={error} /> : loading ? <p className="muted">Loading users…</p> : <div className="table-scroll"><table><thead><tr><th>User</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead><tbody>{users.map(person => <tr key={person.id}><td><div className="user-cell"><Initials name={person.name} /><div><strong>{person.name}</strong><small>{person.email}</small></div></div></td><td>{person.role}{person.console_access && <small className="block">{person.console_access}</small>}</td><td>{person.department || '—'}</td><td><Badge tone={person.status === 'Active' ? 'success' : person.status === 'Pending' ? 'warning' : 'neutral'}>{person.status}</Badge></td><td>{canEdit ? <button className="button tiny" onClick={() => setSelected(person)}>Edit</button> : <span className="muted">Read only</span>}</td></tr>)}</tbody></table>{users.length === 0 && <p className="empty">No users match your search.</p>}</div>}</section>
    {selected && <EditDialog key={selected.id} user={selected} admin={isAdmin} onClose={() => setSelected(null)} onSave={onUpdate} busy={refreshing} />}
    {showAdd && <AddDialog onClose={() => setShowAdd(false)} onSave={async form => { await onCreate(form); setShowAdd(false) }} busy={refreshing} />}
  </>
}

function Modal({ title, children, onClose }) {
  useEffect(() => { const escape = event => { if (event.key === 'Escape') onClose() }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape) }, [onClose])
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-top"><div><p className="eyebrow">User administration</p><h2>{title}</h2></div><button className="close" aria-label="Close dialog" onClick={onClose}>×</button></div>{children}</section></div>
}

function EditDialog({ user, admin, onSave, onClose, busy }) {
  const [form, setForm] = useState({ name: user.name, department: user.department, status: user.status, role: user.role, console_access: user.console_access || '' })
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    const payload = { name: form.name, department: form.department, status: form.status, ...(admin ? { role: form.role, console_access: form.role === 'Staff' ? form.console_access || null : null } : {}) }
    try { await onSave(user.id, payload); onClose() } catch (err) { setError(err.message) }
  }
  return <Modal title={user.name} onClose={onClose}><form onSubmit={submit} className="modal-form"><label>Full name<input required minLength="2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>University email<input value={user.email} readOnly /></label><div className="form-columns"><label>Role<select disabled={!admin} value={form.role} onChange={e => setForm({ ...form, role: e.target.value, console_access: '' })}>{UNIVERSITY_ROLES.map(x => <option key={x}>{x}</option>)}</select></label><label>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{['Active', 'Pending', 'Inactive'].map(x => <option key={x}>{x}</option>)}</select></label></div>{admin && form.role === 'Staff' && <label>Console access<select value={form.console_access} onChange={e => setForm({ ...form, console_access: e.target.value })}><option value="">None</option><option>Operator</option><option>Viewer</option></select></label>}<label>Department<input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></label>{error && <ErrorNotice message={error} />}<div className="modal-actions"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div></form></Modal>
}

function AddDialog({ onSave, onClose, busy }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'Faculty', department: '', console_access: '' })
  const [error, setError] = useState('')
  async function submit(event) { event.preventDefault(); try { await onSave({ ...form, console_access: form.role === 'Staff' ? form.console_access || null : null }) } catch (err) { setError(err.message) } }
  return <Modal title="Add a user" onClose={onClose}><form className="modal-form" onSubmit={submit}><label>Full name<input required minLength="2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Email address<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><div className="form-columns"><label>Role<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value, console_access: '' })}>{UNIVERSITY_ROLES.map(x => <option key={x}>{x}</option>)}</select></label><label>Department<input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></label></div>{form.role === 'Staff' && <label>Console access<select value={form.console_access} onChange={e => setForm({ ...form, console_access: e.target.value })}><option value="">None</option><option>Operator</option><option>Viewer</option></select></label>}<p className="hint">New accounts start as Pending. Invitation email delivery is not implemented yet.</p>{error && <ErrorNotice message={error} />}<div className="modal-actions"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Creating…' : 'Create pending user'}</button></div></form></Modal>
}

function Roles() { return <><div className="section-toolbar"><div><h2>Permission model</h2><p className="muted">Current Admin Console access levels (read-only overview).</p></div></div><div className="role-grid">{ACCESS.map((x, i) => <section className="card role-card" key={x.title}><span className="role-symbol">{x.title[0]}</span><h2>{x.title}</h2><p className="muted">{x.detail}</p><div className="role-foot"><Badge>{i === 0 ? 'Full access' : i === 1 ? 'Manage accounts' : 'Read only'}</Badge></div></section>)}</div><p className="hint">University roles: Student, Faculty, Staff, Applicant, Administrator. Permission editing is planned for a later phase.</p></> }

function Status({ health, error }) { return <><div className="section-toolbar"><div><h2>Service health</h2><p className="muted">Actual status of the starter backend.</p></div></div>{error ? <ErrorNotice message={error} /> : <div className="card"><div className="health-item"><span><i className="status-dot" />{health?.service || 'Checking Core API…'}</span><Badge tone="success">{health?.status || 'Checking'}</Badge></div><p className="hint">Identity, SIS, LMS Core, Academic Scheduling, Admissions, audit pipeline monitoring and API gateway checks are not yet implemented.</p></div>}</> }

function Audit({ rows, error }) { return <><div className="section-toolbar"><div><h2>Audit activity</h2><p className="muted">Latest administrative and authentication events.</p></div></div>{error ? <ErrorNotice message={error} /> : <section className="card table-card"><div className="table-scroll"><table><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Result</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{new Date(row.timestamp).toLocaleString()}</td><td>{row.actor}</td><td>{row.action}</td><td>{row.target}</td><td><Badge tone={row.result === 'Success' ? 'success' : 'danger'}>{row.result}</Badge></td></tr>)}</tbody></table>{rows.length === 0 && <p className="empty">No activity yet.</p>}</div></section>}</> }

function Home({ user, setPage }) { const mods = MODULES[user.role] || []
  return <><div className="welcome-card"><p className="eyebrow">{user.role} · {user.department}</p><h2>Welcome, {user.name.split(' ')[0]}.</h2><p>You are signed in to Core Platform. Module integrations come later.</p></div><div className="section-toolbar"><div><h2>University modules</h2><p className="muted">These modules belong to separate teams and are not connected yet.</p></div></div><div className="module-grid">{mods.map(([title, service]) => <article className="card module-card" key={title}><div className="module-icon">{service.slice(0, 2).toUpperCase()}</div><h2>{title}</h2><p className="muted">{service}</p><div className="module-foot"><Badge>Integration pending</Badge></div></article>)}{user.role === 'Staff' && user.console_access && <button className="card module-card module-button" onClick={() => setPage('dashboard')}><div className="module-icon">CP</div><h2>Admin Console</h2><p className="muted">{user.console_access} access</p><div className="module-foot"><span className="text-link">Open console →</span></div></button>}</div></> }

function Profile({ user }) { return <section className="card profile-card"><div className="section-heading"><div><p className="eyebrow">Account</p><h2>University profile</h2></div></div><div className="profile-head"><Initials name={user.name} /><div><h2>{user.name}</h2><p className="muted">{user.role}{user.console_access ? ` · ${user.console_access}` : ''}</p></div></div><div className="profile-fields"><div><small>University email</small><strong>{user.email}</strong></div><div><small>Department</small><strong>{user.department || 'Not set'}</strong></div><div><small>Account status</small><Badge tone="success">{user.status}</Badge></div></div><p className="hint">Profile editing and password changes are planned for the next phase.</p></section> }

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('core_token'))
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(Boolean(token))
  const [page, setPage] = useState('dashboard')
  const [dashboard, setDashboard] = useState(null)
  const [users, setUsers] = useState([])
  const [audit, setAudit] = useState([])
  const [health, setHealth] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filters, setFilters] = useState({ q: '', role: '', status: '' })
  const [notice, setNotice] = useState('')

  function signOut() {
    sessionStorage.removeItem('core_token')
    setToken(null)
    setUser(null)
    setDashboard(null)
    setAudit([])
    setUsers([])
    setNotice('')
    setError('')
  }

  useEffect(() => {
    if (!token) { setBooting(false); return }
    let active = true
    api('/me', token).then(data => { if (active) { setUser(data); setPage(data.role === 'Administrator' ? 'dashboard' : 'home') } }).catch(() => { if (active) signOut() }).finally(() => { if (active) setBooting(false) })
    return () => { active = false }
  }, [token])

  async function login(email, password) {
    const result = await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email, password }) })
    sessionStorage.setItem('core_token', result.access_token)
    setToken(result.access_token)
    setUser(result.user)
    setPage(result.user.role === 'Administrator' ? 'dashboard' : 'home')
  }

  const canAccessAdmin = user && (user.role === 'Administrator' || (user.role === 'Staff' && ['Operator', 'Viewer'].includes(user.console_access)))
  const canEdit = user && (user.role === 'Administrator' || user.console_access === 'Operator')

  useEffect(() => {
    if (!token || !user) return
    if (['dashboard', 'users', 'roles', 'status', 'audit'].includes(page) && !canAccessAdmin) { setPage('home'); return }
    setError('')
    let active = true
    const load = async () => {
      try {
        if (page === 'dashboard') { const data = await api('/admin/dashboard', token); if (active) setDashboard(data) }
        if (page === 'users') {
          setLoadingUsers(true)
          const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value))
          const data = await api(`/admin/users?${params}`, token)
          if (active) setUsers(data)
        }
        if (page === 'audit' && user.role === 'Administrator') { const data = await api('/admin/audit', token); if (active) setAudit(data) }
        if (page === 'status') { const data = await api('/health', token); if (active) setHealth(data) }
      } catch (err) {
        if (active) {
          if (err.status === 401) signOut()
          else setError(err.message)
        }
      } finally { if (active) setLoadingUsers(false) }
    }
    load()
    return () => { active = false }
  }, [token, user?.id, page, filters.q, filters.role, filters.status])

  async function updateUser(id, body) {
    setBusy(true)
    try {
      await api(`/admin/users/${id}`, token, { method: 'PATCH', body: JSON.stringify(body) })
      const data = await api('/admin/users', token)
      setUsers(data)
      setNotice('User updated. The change is recorded in Activity Log.')
    } finally { setBusy(false) }
  }

  async function createUser(body) {
    setBusy(true)
    try {
      await api('/admin/users', token, { method: 'POST', body: JSON.stringify(body) })
      const data = await api('/admin/users', token)
      setUsers(data)
      setNotice('Pending user created. Invitation email delivery is not implemented.')
    } finally { setBusy(false) }
  }

  if (booting) return <div className="boot">Loading Core Platform…</div>
  if (!user) return <SignIn onLogin={login} />
  return <div className="app-shell"><Sidebar user={user} page={page} setPage={p => { setPage(p); setNotice('') }} canAccessAdmin={canAccessAdmin} signOut={signOut} /><main className="main"><Header user={user} page={page} />{notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
    {page === 'dashboard' && <Dashboard data={dashboard} error={error} />}
    {page === 'users' && <Users users={users} loading={loadingUsers} error={error} filters={filters} setFilters={setFilters} selected={selected} setSelected={setSelected} canEdit={canEdit} isAdmin={user.role === 'Administrator'} onUpdate={updateUser} onCreate={createUser} refreshing={busy} />}
    {page === 'roles' && <Roles />}
    {page === 'status' && <Status health={health} error={error} />}
    {page === 'audit' && user.role === 'Administrator' && <Audit rows={audit} error={error} />}
    {page === 'home' && <Home user={user} setPage={setPage} />}
    {page === 'profile' && <Profile user={user} />}
  </main></div>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
