import React, { useEffect, useState } from 'react'
const UNIVERSITY_ROLES = ['Administrator', 'Student', 'Faculty', 'Staff', 'Applicant']

function Initials({ name }) {
  return <span className="avatar" aria-hidden="true">{name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>
}

function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
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
    <section className="card"><div className="section-heading"><div><p className="eyebrow">Live services</p><h2>Platform health</h2></div><Badge tone="success">Core API</Badge></div><div className="health-item"><span><i className="status-dot" />{data.service.name}</span><Badge tone="success">{data.service.status}</Badge></div>{data.services?.map(service => <div className="health-item" key={service.code}><span>{service.name ?? service.code}</span><Badge tone={service.state === "Operational" ? "success" : "warning"}>{service.state}</Badge></div>)}</section></div>
  </>
}

function ErrorNotice({ message }) { return <p className="error" role="alert">{message}</p> }

function Users({ users, loading, error, filters, setFilters, selected, setSelected, canEdit, isAdmin, canAssignRoles, onUpdate, onCreate, refreshing }) {
  const [showAdd, setShowAdd] = useState(false)
  return <>
    <div className="section-toolbar"><div><h2>Managed users</h2><p className="muted">Search accounts and manage access status.</p></div>{isAdmin && <button className="button primary" onClick={() => setShowAdd(true)}>+ Add user</button>}</div>
    <div className="filter-row"><label className="sr-only" htmlFor="user-query">Search users</label><input id="user-query" maxLength={150} placeholder="Search by name or email" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} /><label className="sr-only" htmlFor="role-filter">Role</label><select id="role-filter" value={filters.role} onChange={e => setFilters({ ...filters, role: e.target.value })}><option value="">All roles</option>{UNIVERSITY_ROLES.map(x => <option key={x}>{x}</option>)}</select><label className="sr-only" htmlFor="status-filter">Status</label><select id="status-filter" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{['Active', 'Pending', 'Inactive'].map(x => <option key={x}>{x}</option>)}</select></div>
    <section className="card table-card">{error ? <ErrorNotice message={error} /> : loading ? <p className="muted">Loading users…</p> : <div className="table-scroll"><table><thead><tr><th>User</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead><tbody>{users.map(person => <tr key={person.id}><td><div className="user-cell"><Initials name={person.name} /><div><strong>{person.name}</strong><small>{person.email}</small></div></div></td><td>{person.role}{person.console_access && <small className="block">{person.console_access}</small>}</td><td>{person.department || '—'}</td><td><Badge tone={person.status === 'Active' ? 'success' : person.status === 'Pending' ? 'warning' : 'neutral'}>{person.status}</Badge></td><td>{canEdit ? <button className="button tiny" onClick={() => setSelected(person)}>Edit</button> : <span className="muted">Read only</span>}</td></tr>)}</tbody></table>{users.length === 0 && <p className="empty">No users match your search.</p>}</div>}</section>
    {selected && <EditDialog key={selected.id} user={selected} admin={canAssignRoles} onClose={() => setSelected(null)} onSave={onUpdate} busy={refreshing} />}
    {showAdd && <AddDialog admin={canAssignRoles} onClose={() => setShowAdd(false)} onSave={async form => { await onCreate(form); setShowAdd(false) }} busy={refreshing} />}
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
    try { await onSave(user.id, Object.fromEntries(Object.entries(payload).filter(([key, value]) => (user[key] ?? null) !== value)));  onClose() } catch (err) { setError(err.message) }
  }
  return <Modal title={user.name} onClose={onClose}><form onSubmit={submit} className="modal-form"><label>Full name<input required minLength="2" maxLength="120" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>University email<input value={user.email} readOnly /></label><div className="form-columns"><label>Role<select disabled={!admin} value={form.role} onChange={e => setForm({ ...form, role: e.target.value, console_access: '' })}>{UNIVERSITY_ROLES.map(x => <option key={x}>{x}</option>)}</select></label><label>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{['Active', 'Pending', 'Inactive'].map(x => <option key={x}>{x}</option>)}</select></label></div>{admin && form.role === 'Staff' && <label>Console access<select value={form.console_access} onChange={e => setForm({ ...form, console_access: e.target.value })}><option value="">None</option><option>Operator</option><option>Viewer</option></select></label>}<label>Department<input maxLength={100} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></label>{error && <ErrorNotice message={error} />}<div className="modal-actions"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div></form></Modal>
}

function AddDialog({ admin, onSave, onClose, busy }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'Faculty', department: '', console_access: '' })
  const [error, setError] = useState('')
  async function submit(event) { event.preventDefault(); try { await onSave({ ...form, console_access: form.role === 'Staff' ? form.console_access || null : null }) } catch (err) { setError(err.message) } }
  return <Modal title="Add a user" onClose={onClose}><form className="modal-form" onSubmit={submit}><label>Full name<input required minLength="2" maxLength="120" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Email address<input required type="email" maxLength="255" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><div className="form-columns"><label>Role<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value, console_access: '' })}>{UNIVERSITY_ROLES.filter(role => admin || role !== 'Administrator').map(x => <option key={x}>{x}</option>)}</select></label><label>Department<input maxLength={100} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></label></div>{admin && form.role === 'Staff' && <label>Console access<select value={form.console_access} onChange={e => setForm({ ...form, console_access: e.target.value })}><option value="">None</option><option>Operator</option><option>Viewer</option></select></label>}<p className="hint">New accounts start as Pending. An invitation email will be queued so the user can set a password.</p>{error && <ErrorNotice message={error} />}<div className="modal-actions"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Creating…' : 'Create pending user'}</button></div></form></Modal>
}

function Audit({ rows, error }) { return <><div className="section-toolbar"><div><h2>Audit activity</h2><p className="muted">Latest administrative and authentication events.</p></div></div>{error ? <ErrorNotice message={error} /> : <section className="card table-card"><div className="table-scroll"><table><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Result</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{new Date(row.timestamp).toLocaleString()}</td><td>{row.actor}</td><td>{row.action}</td><td>{row.target}</td><td><Badge tone={row.result === 'Success' ? 'success' : 'danger'}>{row.result}</Badge></td></tr>)}</tbody></table>{rows.length === 0 && <p className="empty">No activity yet.</p>}</div></section>}</> }

function Profile({ user, onChangePassword }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (next !== confirmation) { setError('The new passwords do not match.'); return }
    if (new TextEncoder().encode(next).length > 72) { setError('The new password must be at most 72 UTF-8 bytes.'); return }
    setBusy(true)
    try {
      await onChangePassword({ current_password: current, new_password: next, confirm_password: confirmation })
    } catch (err) {
      setError(err.message)
    } finally { setBusy(false) }
  }

  return <section className="card profile-card">
    <div className="section-heading"><div><p className="eyebrow">Account</p><h2>University profile</h2></div></div>
    <div className="profile-head"><Initials name={user.name} /><div><h2>{user.name}</h2><p className="muted">{user.role}{user.console_access ? ` / ${user.console_access}` : ''}</p></div></div>
    <div className="profile-fields">
      <div><small>University email</small><strong>{user.email}</strong></div>
      <div><small>Department</small><strong>{user.department || 'Not set'}</strong></div>
      <div><small>Account status</small><Badge tone="success">{user.status}</Badge></div>
    </div>
    <p className="hint">Official account details are managed by your administrator.</p>
    <form className="modal-form password-form" onSubmit={submit}>
      <h2>Change password</h2>
      <p className="hint" id="password-rules">Use at least 8 characters, including a letter and a number. After saving, sign in again on each device.</p>
      <label>Current password<input type="password" autoComplete="current-password" required maxLength={1024} value={current} onChange={e => setCurrent(e.target.value)} /></label>
      <label>New password<input type="password" autoComplete="new-password" aria-describedby="password-rules" required minLength={8} maxLength={72} value={next} onChange={e => setNext(e.target.value)} /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" required maxLength={72} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>{busy ? 'Updating password...' : 'Update password'}</button>
    </form>
  </section>
}


export { Dashboard, Users, Audit, Profile }
