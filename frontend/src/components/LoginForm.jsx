import { useState } from 'react'
import { api } from '../api'
import AuthShell from './AuthShell'

export default function LoginForm({ onSuccess, onSwitchRegister, onSwitchBootstrap, canBootstrap }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api.login(email, password)
      if (!result.success) throw new Error(result.error || 'Login failed')
      api.setAuth(result.data.token, null)
      const me = await api.me()
      if (!me.success) throw new Error(me.error || 'Failed to load profile')
      const spaces = me.data.spaces || []
      if (!spaces.length) throw new Error('No kinship space found for this account')
      const spaceId = spaces[0].id
      const meSpace = await api.me(spaceId)
      const claim = meSpace.data || me.data
      onSuccess({
        token: result.data.token,
        user: claim.user || me.data.user,
        spaces,
        spaceId,
        role: spaces[0].role,
        personId: claim.personId || null,
        personName: claim.personName || null,
        needsClaim: !!claim.needsClaim,
      })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your private kinship graph">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl" />
        </div>
        <button type="submit" disabled={busy}
          className="btn-primary w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:bg-slate-400">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="mt-6 text-center text-sm text-slate-500 space-y-2">
        <button type="button" onClick={onSwitchRegister} className="text-indigo-600 font-semibold hover:underline block w-full">
          Have an invite? Create account
        </button>
        {canBootstrap && (
          <button type="button" onClick={onSwitchBootstrap} className="text-slate-600 hover:underline block w-full">
            First time setup (bootstrap owner)
          </button>
        )}
      </div>
    </AuthShell>
  )
}
