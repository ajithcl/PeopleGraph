import { useState } from 'react'
import { api } from '../api'
import AuthShell from './AuthShell'

export default function BootstrapForm({ onSuccess, onSwitchLogin }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [spaceName, setSpaceName] = useState('Our Family')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api.bootstrap({ email, password, name, spaceName })
      if (!result.success) throw new Error(result.error || 'Bootstrap failed')
      onSuccess({
        token: result.data.token,
        user: result.data.user,
        spaces: [{ ...result.data.space, name: result.data.space.name }],
        spaceId: result.data.space.id,
        role: 'owner',
        personId: result.data.personId,
        personName: result.data.user?.name || name,
        needsClaim: false,
      })
    } catch (err) {
      setError(err.message || 'Bootstrap failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Create your kinship space" subtitle="First-time setup — you become the owner">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Space name</label>
          <input required value={spaceName} onChange={(e) => setSpaceName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password (min 8)</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl" />
        </div>
        <button type="submit" disabled={busy}
          className="btn-primary w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:bg-slate-400">
          {busy ? 'Creating…' : 'Create space & account'}
        </button>
      </form>
      <button type="button" onClick={onSwitchLogin} className="mt-6 w-full text-sm text-indigo-600 font-semibold hover:underline">
        Back to sign in
      </button>
    </AuthShell>
  )
}
