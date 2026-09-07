import { useEffect, useState } from 'react'
import { api } from '../api'

function shareUrlForToken(token, fallbackUrl) {
  if (token && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/?invite=${encodeURIComponent(token)}`
  }
  return fallbackUrl || ''
}

function inviteMessage(url) {
  return `You're invited to a private family space on PeopleGraph:\n${url}`
}

const STATUS_STYLES = {
  pending: 'bg-indigo-50 text-indigo-800',
  used: 'bg-emerald-50 text-emerald-800',
  expired: 'bg-slate-100 text-slate-600',
  revoked: 'bg-red-50 text-red-700',
}

export default function InviteMembersModal({ onClose, role }) {
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviteEmail, setInviteEmail] = useState('')
  const [created, setCreated] = useState(null)
  const [invites, setInvites] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [listCopiedId, setListCopiedId] = useState('')

  const loadInvites = async () => {
    try {
      const result = await api.listInvites()
      if (result.success) setInvites(result.data || [])
    } catch (err) {
      setError(err.message || 'Could not load invites')
    }
  }

  useEffect(() => {
    if (role === 'owner') loadInvites()
  }, [role])

  if (role !== 'owner') {
    return (
      <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="modal-content bg-white rounded-2xl p-6 max-w-md w-full">
          <p className="text-slate-600">Only space owners can create or revoke invites. Editors can still add people and links on the graph.</p>
          <button type="button" onClick={onClose} className="mt-4 w-full bg-slate-200 py-2 rounded-xl">
            Close
          </button>
        </div>
      </div>
    )
  }

  const createdUrl = shareUrlForToken(created?.token, created?.inviteUrl)

  const create = async () => {
    setBusy(true)
    setError('')
    setCopied(false)
    try {
      const result = await api.createInvite(inviteRole, inviteEmail.trim() || null)
      if (!result.success) throw new Error(result.error || 'Failed to create invite')
      setCreated(result.data)
      await loadInvites()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const copyText = async (url, markListId) => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copy this invite link', url)
    }
    if (markListId) {
      setListCopiedId(markListId)
      setTimeout(() => setListCopiedId(''), 2000)
    } else {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareNative = async (url) => {
    if (!navigator.share) return false
    try {
      await navigator.share({
        title: 'PeopleGraph invite',
        text: inviteMessage(url),
        url,
      })
      return true
    } catch (err) {
      if (err?.name === 'AbortError') return true
      return false
    }
  }

  const shareCreated = async () => {
    const ok = await shareNative(createdUrl)
    if (!ok) window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage(createdUrl))}`, '_blank', 'noopener,noreferrer')
  }

  const revoke = async (invite) => {
    if (!window.confirm(`Revoke this ${invite.role} invite${invite.email ? ` for ${invite.email}` : ''}?`)) return
    setBusy(true)
    setError('')
    try {
      const result = await api.revokeInvite(invite.id)
      if (!result.success) throw new Error(result.error || 'Could not revoke')
      if (created?.id === invite.id) setCreated(null)
      await loadInvites()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const delivery = created?.emailDelivery
  const deliveryNote = !created?.email
    ? null
    : delivery?.delivery === 'smtp'
      ? `Invite email sent to ${created.email}`
      : delivery?.delivery === 'console'
        ? `Email not configured — invite logged on the server. Share the link with ${created.email}.`
        : delivery?.ok === false
          ? `Email failed: ${delivery.error || 'unknown error'}. Share the link manually.`
          : null

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="modal-content bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">Invite relative</h2>
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
            <input readOnly value={createdUrl} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50" />
            <button
              type="button"
              onClick={() => copyText(createdUrl)}
              className="btn-primary w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold"
            >
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} mr-2`} />
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={shareCreated}
                className="bg-white border border-slate-200 text-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-50"
              >
                <i className="fas fa-share-alt mr-2" />
                Share
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(inviteMessage(createdUrl))}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 text-white py-3 rounded-xl font-semibold text-center hover:bg-emerald-700"
              >
                <i className="fab fa-whatsapp mr-2" />
                WhatsApp
              </a>
            </div>
            <button
              type="button"
              onClick={() => {
                setCreated(null)
                setInviteEmail('')
                setCopied(false)
              }}
              className="w-full text-sm text-slate-500 hover:underline"
            >
              Create another
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Invites in this space</h3>
          {invites.length === 0 ? (
            <p className="text-sm text-slate-500">None yet. Generate a link above.</p>
          ) : (
            <ul className="space-y-2">
              {invites.map((inv) => {
                const url = shareUrlForToken(inv.token, inv.inviteUrl)
                const canRevoke = inv.status === 'pending' || inv.status === 'expired'
                return (
                  <li key={inv.id} className="border border-slate-100 rounded-xl p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800 capitalize">{inv.role}</p>
                        <p className="text-slate-500">{inv.email || 'No email — share the link'}</p>
                        {inv.createdByName || inv.createdByEmail ? (
                          <p className="text-xs text-slate-400 mt-1">From {inv.createdByName || inv.createdByEmail}</p>
                        ) : null}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg capitalize ${STATUS_STYLES[inv.status] || STATUS_STYLES.pending}`}>
                        {inv.status}
                      </span>
                    </div>
                    {inv.status === 'pending' && url && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => copyText(url, inv.id)}
                          className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 text-slate-700"
                        >
                          {listCopiedId === inv.id ? 'Copied' : 'Copy'}
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(inviteMessage(url))}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800"
                        >
                          WhatsApp
                        </a>
                      </div>
                    )}
                    {canRevoke && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => revoke(inv)}
                        className="mt-2 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
