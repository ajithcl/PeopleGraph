import { useEffect, useState } from 'react'
import { api } from '../api'
import PhotoAvatar from './PhotoAvatar'

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

function yearOfBirth(dob) {
  if (!dob) return null
  const year = new Date(dob).getFullYear()
  return Number.isNaN(year) ? null : year
}

function claimError(message) {
  const text = (message || '').toLowerCase()
  if (text.includes('already claimed') || text.includes('someone else')) {
    return 'Someone else already claimed this person. Pick another listing, or add yourself as new.'
  }
  if (text.includes('not found')) return 'That person is not in this family space.'
  return message || 'Could not save who you are. Try again.'
}

export default function ClaimOnboarding({ session, onClaimed, onLogout }) {
  const [mode, setMode] = useState('pick')
  const [query, setQuery] = useState('')
  const [persons, setPersons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(null)
  const [successPerson, setSuccessPerson] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
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
      setError(claimError(err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load('')
  }, [session.spaceId])

  useEffect(() => {
    const t = setTimeout(() => load(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const finish = (person) => setSuccessPerson(person)

  const confirmClaim = async () => {
    if (!pending) return
    setBusy(true)
    setError('')
    try {
      const result = await api.claimPerson(pending.id)
      if (!result.success) throw new Error(result.error || 'Claim failed')
      setPending(null)
      finish(result.data)
    } catch (err) {
      setError(claimError(err.message))
    } finally {
      setBusy(false)
    }
  }

  const handlePhoto = (file) => {
    if (!file) return
    if (!ALLOWED.includes(file.type)) {
      setError('Please choose a JPG, PNG, GIF, or WebP photo.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be smaller than 5MB.')
      return
    }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const createAndClaim = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api.claimNewPerson(form)
      if (!result.success) throw new Error(result.error || 'Could not create profile')
      const person = result.data
      if (photoFile && person?.id) {
        const upload = await api.uploadPhoto(person.id, photoFile)
        if (upload?.success && upload.data) {
          finish(upload.data)
          return
        }
      }
      finish(person)
    } catch (err) {
      setError(claimError(err.message))
    } finally {
      setBusy(false)
    }
  }

  if (successPerson) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="modal-content bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg p-8 text-center">
          <PhotoAvatar person={successPerson} size="xl" />
          <h1 className="text-2xl font-bold text-slate-800 mt-4">You are {successPerson.name}</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Relatives in <strong>{spaceName}</strong> can now see how they connect to you.
          </p>
          <button
            type="button"
            onClick={() =>
              onClaimed({
                ...session,
                personId: successPerson.id,
                personName: successPerson.name,
                needsClaim: false,
              })
            }
            className="btn-primary mt-6 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold"
          >
            Open family tree
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="modal-content bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-id-card text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Who are you in this family?</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Find your name in <strong>{spaceName}</strong> so relatives can see how they connect to you.
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>}

        <div className="flex space-x-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('pick')}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm ${mode === 'pick' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            I&apos;m already listed
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm ${mode === 'create' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Add me as new
          </button>
        </div>

        {mode === 'pick' ? (
          <div>
            <input
              type="search"
              placeholder="Search by name or nickname…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl mb-3"
            />
            <div className="max-h-80 overflow-y-auto scrollbar-thin border border-slate-100 rounded-xl">
              {loading ? (
                <p className="p-4 text-center text-slate-500 text-sm">Loading…</p>
              ) : persons.length === 0 ? (
                <p className="p-4 text-center text-slate-500 text-sm">
                  No matching unclaimed people. Try <strong>Add me as new</strong>.
                </p>
              ) : (
                persons.map((p) => {
                  const yob = yearOfBirth(p.dateOfBirth)
                  const relatives = (p.relatedNames || []).slice(0, 2)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={busy}
                      onClick={() => setPending(p)}
                      className="w-full text-left p-3 hover:bg-indigo-50 border-b border-slate-50 flex items-center justify-between disabled:opacity-50"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <PhotoAvatar person={p} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {p.nickName ? `"${p.nickName}"` : ''}
                            {p.nickName && yob ? ' · ' : ''}
                            {yob ? `born ${yob}` : ''}
                            {!p.nickName && !yob && relatives.length === 0 ? 'No extra details' : ''}
                          </p>
                          {relatives.length > 0 && (
                            <p className="text-xs text-slate-400 truncate">Linked to {relatives.join(', ')}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-indigo-600 text-sm font-semibold flex-shrink-0 ml-2">This is me</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={createAndClaim} className="space-y-3">
            <input
              required
              placeholder="Full name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl"
            />
            <input
              placeholder="Nickname (what family calls you)"
              value={form.nickName}
              onChange={(e) => setForm({ ...form, nickName: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                required
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl"
              />
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Photo (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhoto(e.target.files[0])}
                className="mt-1 block w-full text-sm text-slate-600"
              />
            </label>
            {photoPreview && <img src={photoPreview} alt="" className="w-20 h-20 rounded-xl object-cover" />}
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:bg-slate-400"
            >
              {busy ? 'Saving…' : 'Create my listing'}
            </button>
          </form>
        )}

        <button type="button" onClick={onLogout} className="mt-6 w-full text-sm text-slate-500 hover:underline">
          Sign out
        </button>
      </div>

      {pending && (
        <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="modal-content bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-4 mb-4">
              <PhotoAvatar person={pending} size="lg" />
              <div>
                <h2 className="text-xl font-bold text-slate-800">This is me: {pending.name}</h2>
                {pending.nickName && <p className="text-sm text-slate-500">&quot;{pending.nickName}&quot;</p>}
                {yearOfBirth(pending.dateOfBirth) && (
                  <p className="text-sm text-slate-500">Born {yearOfBirth(pending.dateOfBirth)}</p>
                )}
              </div>
            </div>
            {(pending.relatedNames || []).length > 0 && (
              <p className="text-sm text-slate-600 mb-4">Linked to {(pending.relatedNames || []).slice(0, 2).join(', ')}</p>
            )}
            <p className="text-sm text-slate-500 mb-6">
              Confirm only if this listing is you — cousins with the same name can look similar.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold"
              >
                Not me
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={confirmClaim}
                className="btn-primary flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:bg-slate-400"
              >
                {busy ? 'Saving…' : 'Yes, this is me'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
