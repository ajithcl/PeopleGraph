import { useEffect, useState } from 'react'
import { api } from '../api'
import PhotoAvatar from './PhotoAvatar'

export default function ClaimOnboarding({ session, onClaimed, onLogout }) {
  const [mode, setMode] = useState('pick')
  const [query, setQuery] = useState('')
  const [persons, setPersons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: session.user?.name || '',
    gender: 'male',
    nickName: '',
    dateOfBirth: '',
  })

  const spaceName = (session.spaces || []).find((s) => s.id === session.spaceId)?.name || 'your family'

  const load = async (q = '') => {
    setLoading(true)
    setError('')
    try {
      api.setAuth(session.token, session.spaceId)
      const result = await api.getClaimablePersons(q)
      if (!result.success) throw new Error(result.error || 'Failed to load people')
      setPersons(result.data.persons || [])
    } catch (err) {
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load('') }, [session.spaceId])
  useEffect(() => {
    const t = setTimeout(() => load(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const finish = (person) => {
    onClaimed({
      ...session,
      personId: person.id,
      personName: person.name,
      needsClaim: false,
    })
  }

  const claimExisting = async (person) => {
    setBusy(true)
    setError('')
    try {
      const result = await api.claimPerson(person.id)
      if (!result.success) throw new Error(result.error || 'Claim failed')
      finish(result.data)
    } catch (err) {
      setError(err.message || 'Claim failed')
    } finally {
      setBusy(false)
    }
  }

  const createAndClaim = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api.claimNewPerson(form)
      if (!result.success) throw new Error(result.error || 'Could not create profile')
      finish(result.data)
    } catch (err) {
      setError(err.message || 'Could not create profile')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="modal-content bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-id-card text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Who are you on the graph?</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Claim your Person in <strong>{spaceName}</strong> so relatives can see how they connect to you.
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>}

        <div className="flex space-x-2 mb-4">
          <button type="button" onClick={() => setMode('pick')}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm ${mode === 'pick' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            I&apos;m already listed
          </button>
          <button type="button" onClick={() => setMode('create')}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm ${mode === 'create' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            Add me as new
          </button>
        </div>

        {mode === 'pick' ? (
          <div>
            <input type="search" placeholder="Search by name…" value={query} onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl mb-3" />
            <div className="max-h-72 overflow-y-auto scrollbar-thin border border-slate-100 rounded-xl">
              {loading ? (
                <p className="p-4 text-center text-slate-500 text-sm">Loading…</p>
              ) : persons.length === 0 ? (
                <p className="p-4 text-center text-slate-500 text-sm">No matching unclaimed people. Try “Add me as new”.</p>
              ) : (
                persons.map((p) => (
                  <button key={p.id} type="button" disabled={busy} onClick={() => claimExisting(p)}
                    className="w-full text-left p-3 hover:bg-indigo-50 border-b border-slate-50 flex items-center justify-between disabled:opacity-50">
                    <div className="flex items-center space-x-3">
                      <PhotoAvatar person={p} size="sm" />
                      <div>
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        {p.nickName && <p className="text-xs text-slate-500">&quot;{p.nickName}&quot;</p>}
                      </div>
                    </div>
                    <span className="text-indigo-600 text-sm font-semibold">Claim</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={createAndClaim} className="space-y-3">
            <input required placeholder="Full name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl" />
            <select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl">
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <button type="submit" disabled={busy}
              className="btn-primary w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:bg-slate-400">
              {busy ? 'Saving…' : 'Create & claim profile'}
            </button>
          </form>
        )}

        <button type="button" onClick={onLogout} className="mt-6 w-full text-sm text-slate-500 hover:underline">
          Sign out
        </button>
      </div>
    </div>
  )
}
