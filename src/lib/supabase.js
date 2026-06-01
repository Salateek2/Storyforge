const BASE = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const TOKEN_KEY = 'sf_token'

function getToken() { return localStorage.getItem(TOKEN_KEY) }
function saveToken(t) { localStorage.setItem(TOKEN_KEY, t) }
function clearToken() { localStorage.removeItem(TOKEN_KEY) }

function headers(extra = {}) {
  const token = getToken()
  return {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${token ?? ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...extra,
  }
}

// ── Auth ─────────────────────────────────────────────────────────────
export async function signUp(email, password) {
  const r = await fetch(`${BASE}/auth/v1/signup`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  })
  return r.json()
}

export async function signIn(email, password) {
  const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  })
  const data = await r.json()
  if (data.access_token) saveToken(data.access_token)
  return data
}

export async function signOut() {
  await fetch(`${BASE}/auth/v1/logout`, { method: 'POST', headers: headers() })
  clearToken()
}

export async function getUser() {
  if (!getToken()) return null
  const r = await fetch(`${BASE}/auth/v1/user`, { headers: headers() })
  if (!r.ok) { clearToken(); return null }
  return r.json()
}

// ── Database ──────────────────────────────────────────────────────────
async function request(path, method = 'GET', body = null, extra = {}) {
  const r = await fetch(`${BASE}/rest/v1${path}`, {
    method,
    headers: headers(extra),
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  const data = text ? JSON.parse(text) : null
  return r.ok ? { data, error: null } : { data: null, error: data }
}

export const dbSelect = (table, query = '') => request(`/${table}${query ? '?' + query : ''}`)
export const dbInsert = (table, body)        => request(`/${table}`, 'POST', body)
export const dbUpdate = (table, filter, body) => request(`/${table}?${filter}`, 'PATCH', body)
export const dbDelete = (table, filter)       => request(`/${table}?${filter}`, 'DELETE')
// Insert-or-update on the primary key. Requires a unique/PK column to merge on.
export const dbUpsert = (table, body) =>
  request(`/${table}`, 'POST', body, { 'Prefer': 'return=representation,resolution=merge-duplicates' })
