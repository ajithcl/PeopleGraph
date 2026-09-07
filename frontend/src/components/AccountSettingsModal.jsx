import { useState } from 'react'
import { api, saveSession } from '../api'

export default function AccountSettingsModal({ session, onClose, onSessionUpdate }) {
  const [name, setName] = useState(session.user?.name || '')
  const [email, setEmail] = useState(session.user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (newPassword && newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }
    setBusy(true)
    try {
      const payload = {
        currentPassword,
        name: name.trim(),
        email: email.trim(),
      }
      if (newPassword) payload.newPassword = newPassword
      const result = await api.updateAccount(payload)
      if (!result.success) throw new Error(result.error || 'Could not update account')
      const user = result.data.user
      const token = result.data.token
      if (token) api.setAuth(token, session.spaceId)
      const next = {
        ...session,
        token: token || session.token,
        user: { ...session.user, ...user },
      }
      saveSession(next)
      onSessionUpdate(next)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setOk('Account updated. Use the new email and password the next time you sign in.')
    } catch (err) {
      setError(err.message || 'Could not update account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="modal-content bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-thin p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Account</h2>
            <p className="text-sm text-slate-500 mt-1">Change how you sign in. This is not your listing on the family tree.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl" aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}
          {ok && <div className="bg-emerald-50 text-emerald-800 text-sm p-3 rounded-lg">{ok}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New password (optional)</label>
            <input
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl"
              autoComplete="new-password"
              placeholder="Leave blank to keep the current password"
            />
          </div>
          {newPassword ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl"
                autoComplete="new-password"
              />
            </div>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold">
              Close
            </button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:bg-slate-400">
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
