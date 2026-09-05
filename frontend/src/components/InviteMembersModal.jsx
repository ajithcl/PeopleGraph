import { useState } from 'react'
import { api } from '../api'

export default function InviteMembersModal({ onClose, role }) {
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviteEmail, setInviteEmail] = useState('')
  const [created, setCreated] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (role !== 'owner') {
    return (
      <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="modal-content bg-white rounded-2xl p-6 max-w-md w-full">
          <p className="text-slate-600">Only space owners can create invites.</p>
          <button type="button" onClick={onClose} className="mt-4 w-full bg-slate-200 py-2 rounded-xl">
            Close
          </button>
        </div>
      </div>
    )
  }

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await api.createInvite(inviteRole, inviteEmail.trim() || null)
      if (!result.success) throw new Error(result.error || 'Failed to create invite')
      setCreated(result.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const inviteUrl =
    created?.inviteUrl || (created ? `${window.location.origin}/?invite=${encodeURIComponent(created.token)}` : '')
  const delivery = created?.emailDelivery
  const deliveryNote = !created?.email
    ? null
    : delivery?.delivery === 'smtp'
      ? `Invite email sent to ${created.email}`
      : delivery?.delivery === 'console'
        ? `Email not configured — invite logged on server. Share the link with ${created.email}.`
        : delivery?.ok === false
          ? `Email failed: ${delivery.error || 'unknown error'}. Share the link manually.`
          : null

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="modal-content bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">
            <i className="fas fa-user-plus mr-2 text-indigo-600" />
            Invite relative
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl" aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>}
        {!created ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email (optional)</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="cousin@example.com"
                className="w-full p-3 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl">
                <option value="viewer">Viewer — can explore the graph</option>
                <option value="editor">Editor — can add/edit people & links</option>
              </select>
            </div>
            <button type="button" onClick={create} disabled={busy} className="btn-primary w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:bg-slate-400">
              {busy ? 'Creating…' : 'Generate invite'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveryNote && (
              <div className={`text-sm p-3 rounded-lg ${delivery?.delivery === 'smtp' ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                {deliveryNote}
              </div>
            )}
            <p className="text-sm text-slate-600">Share this link. It expires and is single-use after signup.</p>
            <input readOnly value={inviteUrl} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50" />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl)
                alert('Invite link copied')
              }}
              className="btn-primary w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold"
            >
              <i className="fas fa-copy mr-2" />
              Copy link
            </button>
            <button
              type="button"
              onClick={() => {
                setCreated(null)
                setInviteEmail('')
              }}
              className="w-full text-sm text-slate-500 hover:underline"
            >
              Create another
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
