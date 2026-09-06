import { useEffect, useState } from 'react'
import { api } from '../api'

function formatWhen(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const ICONS = {
  person_added: 'fa-user-plus',
  relationship_linked: 'fa-link',
  invite_accepted: 'fa-envelope-open',
  claim: 'fa-id-card',
}

export default function ActivityFeed({ refreshKey }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .getActivity()
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load updates')
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4 sm:p-6 overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <h3 className="text-lg font-bold text-slate-800 flex items-center">
          <i className="fas fa-clock mr-2 text-indigo-600" />
          Recent family updates
        </h3>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-slate-400`} />
      </button>
      {open && (
        <div className="mt-4 space-y-3 max-h-72 overflow-y-auto scrollbar-thin">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && items.length === 0 && <p className="text-sm text-slate-500">No updates yet in this space.</p>}
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 border-b border-slate-50 pb-3">
              <i className={`fas ${ICONS[item.verb] || 'fa-circle'} text-indigo-500 mt-1`} />
              <div className="min-w-0">
                <p className="text-sm text-slate-800">{item.summary}</p>
                <p className="text-xs text-slate-400">
                  {item.actorName ? `${item.actorName} · ` : ''}
                  {formatWhen(item.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
