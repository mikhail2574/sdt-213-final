import { useEffect, useState, type DependencyList, type FormEvent, type ReactNode } from 'react'
import { BrowserRouter, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider'
import useAuth, { useCurrentUser } from './auth/useAuth'
import RequireAuth from './auth/RequireAuth'
import GuestOnly from './auth/GuestOnly'
import RequirePermission from './auth/RequirePermission'
import StartRedirect from './auth/StartRedirect'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import EmailLinkPage from './features/auth/EmailLinkPage'
import { Dashboard, Users, Audit, Profile } from './LegacyViews'
import { request, type DownloadedFile } from './api/client'
import { adminApi } from './api/adminApi'
import { meApi } from './api/meApi'
import { usersApi } from './api/usersApi'
import { reportsApi } from './api/reportsApi'
import { messagesApi } from './api/messagesApi'
import { notificationsApi } from './api/notificationsApi'
import { PERMISSIONS as P, type Permission } from './lib/permissions'
import { errorMessage, formatDateTime } from './lib/format'
import type { AdminSettings, AuditFilters, Conversation, MeUpdate, NewUser, NotificationsResponse, RoleDefinition, User, UserFilters, UserUpdate } from './types/api'

// Ignore late responses when filters, routes or the signed-in account change.
function useLoad<T>(loader: () => Promise<T>, dependencies: DependencyList = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    loader().then(value => { if (active) setData(value) })
      .catch(err => { if (active) setError(errorMessage(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
    // Callers list every reactive value used by their loader.
  }, [...dependencies, version])
  return { data, error, loading, reload: () => setVersion(value => value + 1) }
}

function LoadState({ state, children }: { state: { loading: boolean; error: string }; children: ReactNode }) {
  if (state.loading) return <p role="status">Loading…</p>
  if (state.error) return <p className="error" role="alert">{state.error}</p>
  return <>{children}</>
}

async function download(file: Promise<DownloadedFile>) {
  const { blob, filename } = await file
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename ?? 'export.csv'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function AuthLayout() {
  return <div className="login-page"><section className="login-panel">
    <div className="brand"><div className="brand-symbol">CP</div><strong>Core Platform</strong></div>
    <div className="login-content auth-content"><Outlet /></div>
    <p className="hint">University Portal · SDT-213</p>
  </section><aside className="login-illustration"><div className="illustration-title">One platform.<br />Every university role.</div></aside></div>
}

function Shell() {
  const { can, logout } = useAuth()
  const user = useCurrentUser()
  const [error, setError] = useState('')
  const links: [string, string, Permission?][] = [
    ['/home', 'Home'], ['/profile', 'My Profile'], ['/notifications', 'Notifications'],
    ['/messages', 'Messages', P.MESSAGES_SEND], ['/directory', 'Directory', P.DIRECTORY_VIEW],
    ['/reports', 'Reports', P.REPORTS_VIEW], ['/announcements', 'Announcements', P.ANNOUNCEMENTS_SEND],
    ['/admin/dashboard', 'Dashboard', P.DASHBOARD_VIEW], ['/admin/users', 'Users', P.USERS_VIEW],
    ['/admin/roles', 'Roles & Access', P.ROLES_VIEW], ['/admin/status', 'System Status', P.STATUS_VIEW],
    ['/admin/audit', 'Activity Log', P.AUDIT_VIEW], ['/admin/settings', 'Settings', P.SETTINGS_MANAGE],
  ]
  return <div className="app-shell"><aside className="sidebar">
    <div className="brand"><div className="brand-symbol">CP</div><div><strong>Core Platform</strong><small>University Portal</small></div></div>
    <nav className="nav" aria-label="Main navigation">{links.filter(([, , permission]) => !permission || can(permission)).map(([path, label]) =>
      <NavLink key={path} to={path} className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`}>{label}</NavLink>)}</nav>
    <div className="sidebar-footer"><div className="sidebar-user"><div><strong>{user.name}</strong><small>{user.console_access ?? user.role}</small></div></div>
      <button className="signout" onClick={() => { setError(''); logout().catch(err => setError(errorMessage(err))) }}>Sign out →</button></div>
  </aside><main className="main">{error && <p className="error" role="alert">{error}</p>}<Outlet /></main></div>
}

function Heading({ children }: { children: ReactNode }) {
  return <header className="page-header"><h1>{children}</h1></header>
}

function HomePage() {
  const user = useCurrentUser()
  const [error, setError] = useState('')
  const [launching, setLaunching] = useState('')
  async function launch(code: string) {
    setError(''); setLaunching(code)
    try {
      const result = await request<{ launch_url: string }>('/auth/module-ticket', { method: 'POST', body: { code } })
      window.location.assign(result.launch_url)
    } catch (err) { setError(errorMessage(err)) } finally { setLaunching('') }
  }
  return <><Heading>Home</Heading><div className="welcome-card"><h2>Welcome, {user.preferred_name || user.name}.</h2><p>{user.role} · {user.department || 'University Portal'}</p></div>
    {error && <p className="error" role="alert">{error}</p>}
    <h2>University modules</h2><div className="module-grid">{user.modules?.map(module => <section className="card module-card" key={module.code}>
      <h2>{module.name}</h2><button className="button primary" disabled={Boolean(launching)} onClick={() => launch(module.code)}>{launching === module.code ? 'Opening…' : 'Open module'}</button>
    </section>)}</div>{!user.modules?.length && <p>No modules are available for this account.</p>}</>
}

function DashboardPage({ statusOnly = false }: { statusOnly?: boolean }) {
  const state = useLoad(adminApi.dashboard)
  return <><Heading>{statusOnly ? 'System Status' : 'Dashboard'}</Heading><LoadState state={state}>
    {statusOnly ? <div className="card page-card">{state.data?.services?.map(service => <div className="health-item" key={service.code}><span>{service.name ?? service.code}</span><span>{service.state}</span></div>)}</div>
      : state.data && <Dashboard data={state.data} error="" />}
  </LoadState></>
}

function UsersPage({ directory = false }: { directory?: boolean }) {
  const { can } = useAuth()
  const [filters, setFilters] = useState<UserFilters>({ q: '', role: '', status: '' })
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const state = useLoad(() => request<{ items: User[]; total: number }>('/users', { params: { ...filters, page, size: 25 } }), [filters.q, filters.role, filters.status, page])
  async function save(action: Promise<unknown>, message: string) {
    setBusy(true)
    try { await action; setNotice(message); state.reload() } finally { setBusy(false) }
  }
  return <><Heading>{directory ? 'Directory' : 'Users'}</Heading>{notice && <p className="notice" role="status">{notice}</p>}
    <Users users={state.data?.items ?? []} loading={state.loading} error={state.error} filters={filters}
      setFilters={(next: UserFilters) => { setFilters(next); setPage(0) }} selected={selected} setSelected={setSelected}
      canEdit={!directory && can(P.USERS_EDIT)} isAdmin={!directory && can(P.USERS_CREATE)}
      canAssignRoles={can(P.ROLES_ASSIGN)}
      onUpdate={(id: number, changes: UserUpdate) => save(usersApi.update(id, changes), 'User updated.')}
      onCreate={(body: NewUser) => save(usersApi.create(body), 'Pending user created. An invitation email has been queued.')} refreshing={busy} />
    <div className="pagination"><button className="button" disabled={!page || state.loading} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} · {state.data?.total ?? 0} users</span><button className="button" disabled={state.loading || (page + 1) * 25 >= (state.data?.total ?? 0)} onClick={() => setPage(page + 1)}>Next</button></div>
  </>
}

function RolesPage() {
  const state = useLoad(() => request<RoleDefinition[]>('/roles'))
  return <><Heading>Roles & Access</Heading><LoadState state={state}><div className="role-grid">{state.data?.map(role => <section className="card role-card" key={role.code}><h2>{role.code}</h2><ul>{role.permissions.map(permission => <li key={permission}>{permission}</li>)}</ul></section>)}</div></LoadState></>
}

function ReportsPage() {
  const [period, setPeriod] = useState(String(new Date().getFullYear()))
  const [requestedPeriod, setRequestedPeriod] = useState(period)
  const state = useLoad(() => reportsApi.get(requestedPeriod), [requestedPeriod])
  const [exportError, setExportError] = useState('')
  const [exporting, setExporting] = useState(false)
  async function exportCsv() {
    setExporting(true); setExportError('')
    try { await download(reportsApi.csv(requestedPeriod)) } catch (err) { setExportError(errorMessage(err)) } finally { setExporting(false) }
  }
  return <><Heading>Reports</Heading><form className="section-toolbar" onSubmit={event => { event.preventDefault(); if (period.trim()) { setRequestedPeriod(period.trim()); state.reload() } }}>
    <label>Report period<input required maxLength={100} value={period} onChange={event => setPeriod(event.target.value)} /></label>
    <button className="button primary" disabled={state.loading}>Generate report</button><button className="button" type="button" disabled={state.loading || exporting || !state.data || !!state.error} onClick={exportCsv}>Export CSV</button>
  </form>{exportError && <p className="error" role="alert">{exportError}</p>}<LoadState state={state}>
    <p>Period: {state.data?.period} · Scope: {state.data?.scope === 'own_courses' ? 'Own courses' : 'Platform'}</p>
    {state.data?.missing_modules.map(module => <p className="notice" key={module.module}>{module.module}: {module.reason}</p>)}
    {state.data?.rows.length ? <div className="card table-scroll"><table><thead><tr>{state.data.columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{state.data.rows.map((row, index) => <tr key={index}>{state.data!.columns.map(column => <td key={column}>{row[column]}</td>)}</tr>)}</tbody></table></div> : <p>No report data is available for this period.</p>}
  </LoadState></>
}

function ProfilePage() {
  const { refreshUser, endSession } = useAuth()
  const user = useCurrentUser()
  const [form, setForm] = useState({ preferred_name: user.preferred_name ?? '', phone: user.phone ?? '', personal_email: user.personal_email ?? '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  async function update(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try { await meApi.update(form); await refreshUser(); setNotice('Profile saved.') } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  async function changePassword(body: MeUpdate) {
    await request('/auth/change-password', { method: 'POST', body })
    endSession('Password updated. Please sign in with your new password.')
  }
  return <><Heading>My Profile</Heading><form className="card page-card modal-form" onSubmit={update}>
    <label>Preferred name<input maxLength={120} value={form.preferred_name} onChange={event => setForm({ ...form, preferred_name: event.target.value })} /></label>
    <label>Phone<input type="tel" maxLength={40} value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></label>
    <label>Personal email<input type="email" maxLength={255} value={form.personal_email} onChange={event => setForm({ ...form, personal_email: event.target.value })} /></label>
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}<button className="button primary" disabled={busy}>Save profile</button>
  </form><Profile user={user} onChangePassword={changePassword} /></>
}

function NotificationsPage() {
  const [before, setBefore] = useState(0)
  const state = useLoad(() => request<NotificationsResponse & { has_more: boolean; next_before: number }>('/notifications', { params: { before } }), [before])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function read(ids: number[]) {
    setBusy(true); setError('')
    try { await notificationsApi.markRead(ids); state.reload() } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return <><Heading>Notifications</Heading>{error && <p className="error" role="alert">{error}</p>}<LoadState state={state}>
    <div className="section-toolbar"><p>{state.data?.unread_count ?? 0} unread</p><button className="button" disabled={busy || !state.data?.unread_count} onClick={() => read([])}>Mark all as read</button></div>
    {state.data?.items.map(item => <article className="card page-card" key={item.id}><h2>{item.title}</h2><p className="message-text">{item.text}</p><small>{formatDateTime(item.created_at)}</small>{!item.read_at && <button className="button" disabled={busy} onClick={() => read([item.id])}>Mark as read</button>}</article>)}
    {!state.data?.items.length && <p>No notifications.</p>}
    <div className="pagination"><button className="button" disabled={!before} onClick={() => setBefore(0)}>Latest</button><button className="button" disabled={!state.data?.has_more} onClick={() => setBefore(state.data!.next_before)}>Older</button></div>
  </LoadState></>
}

function MessagesPage() {
  const user = useCurrentUser()
  const { can } = useAuth()
  const [before, setBefore] = useState(0)
  const state = useLoad(() => request<{ items: Conversation[]; has_more: boolean; next_before: number }>('/conversations', { params: { before } }), [before])
  const [contactQuery, setContactQuery] = useState('')
  const contacts = useLoad(() => can(P.DIRECTORY_VIEW) || can(P.USERS_VIEW) ? usersApi.list({ q: contactQuery }) : Promise.resolve([]), [contactQuery, can(P.DIRECTORY_VIEW), can(P.USERS_VIEW)])
  const groups = useLoad(() => request<{ code: string; title: string }[]>('/groups'))
  const [recipient, setRecipient] = useState('')
  const [conversation, setConversation] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function send(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      await messagesApi.send(conversation ? { conversation_id: Number(conversation), text }
        : recipient.startsWith('group:') ? { group_code: recipient.slice(6), text } : { recipient_id: Number(recipient), text })
      setText(''); setBefore(0); state.reload()
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  const name = (id: number | null) => contacts.data?.find(contact => contact.id === id)?.name ?? `User ${id ?? ''}`
  return <><Heading>Messages</Heading><form className="card page-card modal-form" onSubmit={send}>
    <label>Conversation<select value={conversation} onChange={event => setConversation(event.target.value)}><option value="">New conversation</option>{state.data?.items.map(item => <option key={item.id} value={item.id}>{item.title || name(item.first_user === user.id ? item.second_user : item.first_user)} (#{item.id})</option>)}</select></label>
    {!conversation && <>
      {(can(P.DIRECTORY_VIEW) || can(P.USERS_VIEW)) && <label>Find recipient<input maxLength={150} value={contactQuery} onChange={event => { setContactQuery(event.target.value); setRecipient('') }} /></label>}
      <label>Recipient<select required value={recipient} onChange={event => setRecipient(event.target.value)}><option value="">Select a recipient</option>{contacts.data?.filter(contact => contact.id !== user.id && contact.status !== 'Inactive' && contact.status !== 'Pending').map(contact => <option key={contact.id} value={contact.id}>{contact.name} · {contact.role}</option>)}{groups.data?.map(group => <option key={group.code} value={`group:${group.code}`}>{group.title} · Group</option>)}</select></label>
    </>}
    {contacts.error && <p className="error" role="alert">{contacts.error}</p>}
    {groups.error && <p className="error" role="alert">{groups.error}</p>}
    <label>Message<textarea required maxLength={10000} value={text} onChange={event => setText(event.target.value)} /></label>{error && <p className="error" role="alert">{error}</p>}<button className="button primary" disabled={busy || (!conversation && !recipient)}>Send message</button>
  </form><LoadState state={state}>{state.data?.items.map(item => <article className="card page-card" key={item.id}><h2>{item.title || `Conversation #${item.id}`}</h2>{item.messages.map(message => <p className="message-text" key={message.id}><strong>{message.sender_id === user.id ? 'You' : name(message.sender_id)}:</strong> {message.text} <small>{formatDateTime(message.sent_at)}</small></p>)}<details><summary>Message history</summary><MessageHistory id={item.id} /></details><button className="button" onClick={() => { setConversation(String(item.id)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Reply</button></article>)}{!state.data?.items.length && <p>No conversations yet.</p>}
    <div className="pagination"><button className="button" disabled={!before} onClick={() => setBefore(0)}>Latest</button><button className="button" disabled={!state.data?.has_more} onClick={() => { setConversation(''); setBefore(state.data!.next_before) }}>Older conversations</button></div>
  </LoadState></>
}

function MessageHistory({ id }: { id: number }) {
  const [before, setBefore] = useState(0)
  const state = useLoad(() => request<{ items: import('./types/api').Message[]; has_more: boolean; next_before: number }>(`/conversations/${id}/messages`, { params: { before } }), [id, before])
  return <LoadState state={state}>{state.data?.items.slice().reverse().map(message => <p className="message-text" key={message.id}><strong>User {message.sender_id}:</strong> {message.text} <small>{formatDateTime(message.sent_at)}</small></p>)}
    <button className="button" disabled={!before} onClick={() => { setBefore(0); state.reload() }}>Latest messages</button><button className="button" disabled={!state.data?.has_more} onClick={() => setBefore(state.data!.next_before)}>Older messages</button>
  </LoadState>
}

function AnnouncementsPage() {
  const user = useCurrentUser()
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [audience, setAudience] = useState(user.role === 'Administrator' ? 'ALL' : `DEPARTMENT:${user.department ?? ''}`)
  const [channel, setChannel] = useState<'in_app' | 'email' | 'both'>('in_app')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  async function send(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try { const result = await request<{ recipients: number }>('/notifications', { method: 'POST', body: { title, text, audience, channel, category: 'announcements' } }); setNotice(`Announcement created for ${result.recipients} recipients.`); setTitle(''); setText('') }
    catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return <><Heading>Announcements</Heading><form className="card page-card modal-form" onSubmit={send}>
    <label>Title<input required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /></label>
    <label>Audience<input required maxLength={255} value={audience} onChange={event => setAudience(event.target.value)} /></label><p className="hint">Use ALL, ROLE:Student, DEPARTMENT:Admissions or COURSE:course-code. Staff can send to their department; course audiences require course access.</p>
    <label>Channel<select value={channel} onChange={event => setChannel(event.target.value as typeof channel)}><option value="in_app">In app</option><option value="email">Email</option><option value="both">In app and email</option></select></label>
    <label>Text<textarea required maxLength={10000} value={text} onChange={event => setText(event.target.value)} /></label>
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}<button className="button primary" disabled={busy}>Send announcement</button>
  </form></>
}

function AuditPage() {
  const [query, setQuery] = useState('')
  const filters: AuditFilters = { q: query }
  const state = useLoad(() => adminApi.audit(filters), [query])
  const [error, setError] = useState('')
  return <><Heading>Activity Log</Heading><div className="section-toolbar"><label>Search activity<input maxLength={150} value={query} onChange={event => setQuery(event.target.value)} /></label><button className="button" onClick={() => { setError(''); download(adminApi.auditCsv(filters)).catch(err => setError(errorMessage(err))) }}>Export CSV</button></div>
    {error && <p className="error" role="alert">{error}</p>}<LoadState state={state}><Audit rows={state.data ?? []} error="" /></LoadState></>
}

function SettingsPage() {
  const { refreshUser } = useAuth()
  const state = useLoad(adminApi.settings)
  const [form, setForm] = useState<AdminSettings | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (state.data) setForm(state.data) }, [state.data])
  async function save(event: FormEvent) {
    event.preventDefault(); if (!form) return
    setBusy(true); setError(''); setNotice('')
    try { const saved = await adminApi.saveSettings(form); if (saved) setForm(saved); await refreshUser(); setNotice('Settings saved.') }
    catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return <><Heading>Settings</Heading><LoadState state={state}>{form && <form className="card page-card modal-form" onSubmit={save}>
    <label>University name<input required maxLength={120} value={form.settings.university_name} onChange={event => setForm({ ...form, settings: { ...form.settings, university_name: event.target.value } })} /></label>
    <label>Email sender<input required type="email" maxLength={255} value={form.settings.email_sender} onChange={event => setForm({ ...form, settings: { ...form.settings, email_sender: event.target.value } })} /></label>
    {(['term_start', 'term_end'] as const).map(key => <label key={key}>{key === 'term_start' ? 'Term start' : 'Term end'}<input type="date" value={form.settings[key] ?? ''} onChange={event => setForm({ ...form, settings: { ...form.settings, [key]: event.target.value || null } })} /></label>)}
    {(['min_password_length', 'session_timeout', 'lockout_attempts'] as const).map(key => <label key={key}>{key.replaceAll('_', ' ')}<input required type="number" min={key === 'min_password_length' ? 8 : key === 'lockout_attempts' ? 3 : 1} max={key === 'min_password_length' ? 72 : key === 'lockout_attempts' ? 10 : 120} value={form.settings[key]} onChange={event => setForm({ ...form, settings: { ...form.settings, [key]: Number(event.target.value) } })} /></label>)}
    <h2>Connected modules</h2>{form.modules.map((module, index) => <label className="checkbox-label" key={module.code}><input type="checkbox" checked={module.enabled} onChange={event => setForm({ ...form, modules: form.modules.map((item, i) => i === index ? { ...item, enabled: event.target.checked } : item) })} />{module.name}</label>)}
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}<button className="button primary" disabled={busy}>Save settings</button>
  </form>}</LoadState></>
}

function Protected({ permission }: { permission: Permission }) { return <RequirePermission permission={permission} /> }

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route element={<AuthLayout />}>
      <Route path="email-link" element={<EmailLinkPage />} />
      <Route element={<GuestOnly />}><Route path="login" element={<LoginPage />} /><Route path="register" element={<RegisterPage />} /><Route path="forgot-password" element={<ForgotPasswordPage />} /></Route>
    </Route>
    <Route element={<RequireAuth />}><Route element={<Shell />}>
      <Route index element={<StartRedirect />} /><Route path="home" element={<HomePage />} /><Route path="profile" element={<ProfilePage />} /><Route path="notifications" element={<NotificationsPage />} />
      <Route element={<Protected permission={P.MESSAGES_SEND} />}><Route path="messages" element={<MessagesPage />} /></Route>
      <Route element={<Protected permission={P.DIRECTORY_VIEW} />}><Route path="directory" element={<UsersPage directory />} /></Route>
      <Route element={<Protected permission={P.REPORTS_VIEW} />}><Route path="reports" element={<ReportsPage />} /></Route>
      <Route element={<Protected permission={P.ANNOUNCEMENTS_SEND} />}><Route path="announcements" element={<AnnouncementsPage />} /></Route>
      <Route element={<Protected permission={P.DASHBOARD_VIEW} />}><Route path="admin/dashboard" element={<DashboardPage />} /><Route path="admin/status" element={<DashboardPage statusOnly />} /></Route>
      <Route element={<Protected permission={P.USERS_VIEW} />}><Route path="admin/users" element={<UsersPage />} /><Route path="admin/roles" element={<RolesPage />} /></Route>
      <Route element={<Protected permission={P.AUDIT_VIEW} />}><Route path="admin/audit" element={<AuditPage />} /></Route>
      <Route element={<Protected permission={P.SETTINGS_MANAGE} />}><Route path="admin/settings" element={<SettingsPage />} /></Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route></Route>
  </Routes></AuthProvider></BrowserRouter>
}
