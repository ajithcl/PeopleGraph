import { useEffect, useState } from 'react'
import { api } from '../api'
import AuthShell from './AuthShell'

export default function RegisterForm({ inviteToken: initialToken, onSuccess, onSwitchLogin }) {
  const fromLink = Boolean(initialToken)
  const [inviteToken, setInviteToken] = useState(initialToken || '')
  const [showManualToken, setShowManualToken] = useState(!initialToken)
  const [preview, setPreview] = useState(null)
  const [inviteState, setInviteState] = useState(initialToken ? 'checking' : 'idle')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!inviteToken) {
      setPreview(null)
      setInviteState('idle')
      return
    }
    setInviteState('checking')
    api
      .previewInvite(inviteToken)
      .then((r) => {
        if (r.success) {
          setPreview(r.data)
          if (r.data.email) setEmail(r.data.email)
          setError('')
          setInviteState('valid')
        } else {
          setPreview(null)
          setError(r.error || 'This invite link is not valid.')
          setInviteState('invalid')
        }
      })
      .catch(() => {
        setPreview(null)
        setError('Could not check this invite. Try again, or sign in if you already have an account.')
        setInviteState('invalid')
      })
  }, [inviteToken])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api.register({ email, password, name, inviteToken })
      if (!result.success) throw new Error(result.error || 'Registration failed')
      onSuccess({
        token: result.data.token,
        user: result.data.user,
        spaces: [
          {
            id: result.data.space.id,
            role: result.data.space.role,
            name: result.data.space.name || preview?.spaceName || 'Family',
          },
        ],
        spaceId: result.data.space.id,
        role: result.data.space.role,
        personId: null,
        personName: null,
        needsClaim: true,
      })
      window.history.replaceState?.({}, '', window.location.pathname)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  if (fromLink && inviteState === 'invalid') {
    return (
      <AuthShell title="This invite cannot be used" subtitle="Ask the family owner for a new link">
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
        <button
          type="button"
          onClick={onSwitchLogin}
          className="btn-primary w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold"
        >
          Sign in instead
        </button>
        <button
          type="button"
          onClick={() => {
            setShowManualToken(true)
            setInviteToken('')
            setError('')
            setInviteState('idle')
          }}
          className="mt-4 w-full text-sm text-slate-500 hover:underline"
        >
          I have a different invite code
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Join your family" subtitle="Registration is invite-only">
      <form onSubmit={submit} className="space-y-4">
        {error && inviteState !== 'invalid' && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
        )}
        {preview && (
          <div className="bg-indigo-50 text-indigo-800 text-sm p-3 rounded-lg">
            You&apos;re joining <strong>{preview.spaceName}</strong> as <strong>{preview.role}</strong>
          </div>
        )}

        {fromLink && (inviteState === 'valid' || inviteState === 'checking') ? null : (
          <div>
            {!showManualToken ? (
              <button
                type="button"
                onClick={() => setShowManualToken(true)}
                className="text-sm text-indigo-600 font-semibold hover:underline"
              >
                I have an invite code
              </button>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Invite code</label>
                <input
                  required
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value.trim())}
                  className="w-full p-3 border border-slate-200 rounded-xl font-mono text-sm"
                  placeholder="Paste the code from your invite"
                />
              </div>
            )}
          </div>
        )}

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
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !preview}
          className="btn-primary w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:bg-slate-400"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <button type="button" onClick={onSwitchLogin} className="mt-6 w-full text-sm text-indigo-600 font-semibold hover:underline">
        Already have an account? Sign in
      </button>
    </AuthShell>
  )
}
