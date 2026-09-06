const AUTH_STORAGE_KEY = 'peoplegraph_session'

export function apiBase() {
  return import.meta.env.VITE_API_BASE || ''
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getInviteTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('invite') || ''
}

class ApiService {
  constructor() {
    this.token = null
    this.spaceId = null
  }

  setAuth(token, spaceId) {
    this.token = token
    this.spaceId = spaceId
  }

  authHeaders(json = true) {
    const headers = {}
    if (json) headers['Content-Type'] = 'application/json'
    if (this.token) headers.Authorization = `Bearer ${this.token}`
    return headers
  }

  spacePath(suffix = '') {
    if (!this.spaceId) throw new Error('No kinship space selected')
    return `${apiBase()}/api/spaces/${this.spaceId}${suffix}`
  }

  async request(url, options = {}) {
    const response = await fetch(url, options)
    const data = await response.json().catch(() => ({}))
    if (response.status === 401) {
      const err = new Error(data.error || 'Unauthorized')
      err.status = 401
      throw err
    }
    return data
  }

  bootstrap(payload) {
    return this.request(`${apiBase()}/api/auth/bootstrap`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    })
  }

  register(payload) {
    return this.request(`${apiBase()}/api/auth/register`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    })
  }

  login(email, password) {
    return this.request(`${apiBase()}/api/auth/login`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ email, password }),
    })
  }

  me(spaceId = null) {
    const q = spaceId ? `?spaceId=${encodeURIComponent(spaceId)}` : ''
    return this.request(`${apiBase()}/api/auth/me${q}`, { headers: this.authHeaders(false) })
  }

  previewInvite(token) {
    return this.request(`${apiBase()}/api/invites/${encodeURIComponent(token)}`)
  }

  createInvite(role = 'viewer', email = null) {
    return this.request(this.spacePath('/invites'), {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ role, email: email || null }),
    })
  }

  listInvites() {
    return this.request(this.spacePath('/invites'), { headers: this.authHeaders(false) })
  }

  revokeInvite(inviteId) {
    return this.request(this.spacePath(`/invites/${inviteId}/revoke`), {
      method: 'POST',
      headers: this.authHeaders(),
    })
  }

  getClaimablePersons(query = '') {
    const q = query ? `?query=${encodeURIComponent(query)}` : ''
    return this.request(this.spacePath(`/profile/claimable${q}`), { headers: this.authHeaders(false) })
  }

  claimPerson(personId) {
    return this.request(this.spacePath('/profile/claim'), {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ personId }),
    })
  }

  claimNewPerson(payload) {
    return this.request(this.spacePath('/profile/claim/new'), {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    })
  }

  unclaimPerson() {
    return this.request(this.spacePath('/profile/claim'), {
      method: 'DELETE',
      headers: this.authHeaders(false),
    })
  }

  getActivity() {
    return this.request(this.spacePath('/activity'), { headers: this.authHeaders(false) }).then(
      (d) => d.data || [],
    )
  }

  getAllPersons() {
    return this.request(this.spacePath('/persons'), { headers: this.authHeaders(false) }).then((d) => d.data || [])
  }

  getRelationships() {
    return this.request(this.spacePath('/relationships'), { headers: this.authHeaders(false) }).then((d) => d.data || [])
  }

  getStats() {
    return this.request(this.spacePath('/stats'), { headers: this.authHeaders(false) }).then((d) => d.data || {})
  }

  findShortestPath(a, b) {
    return this.request(this.spacePath(`/path/${a}/${b}`), { headers: this.authHeaders(false) }).then((d) => d.data || null)
  }

  createPerson(personData) {
    return this.request(this.spacePath('/persons'), {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(personData),
    })
  }

  updatePerson(id, personData) {
    return this.request(this.spacePath(`/persons/${id}`), {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify(personData),
    })
  }

  uploadPhoto(personId, file) {
    const formData = new FormData()
    formData.append('photo', file)
    return fetch(this.spacePath(`/persons/${personId}/upload-photo`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: formData,
    }).then((r) => r.json())
  }

  deletePhoto(personId) {
    return this.request(this.spacePath(`/persons/${personId}/delete-photo`), {
      method: 'DELETE',
      headers: this.authHeaders(false),
    })
  }

  createRelationship(relationshipData) {
    return this.request(this.spacePath('/relationships'), {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(relationshipData),
    })
  }

  deleteRelationship(relationshipData) {
    return this.request(this.spacePath('/relationships'), {
      method: 'DELETE',
      headers: this.authHeaders(),
      body: JSON.stringify(relationshipData),
    })
  }
}

export const api = new ApiService()
