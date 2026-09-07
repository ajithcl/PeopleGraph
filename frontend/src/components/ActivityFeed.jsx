import { useEffect, useState } from 'react'
import { api } from '../api'

function formatWhen(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <h3 className="text-sm font-semibold text-slate-800">Recent family updates</h3>
        <span className="text-xs font-medium text-slate-400">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-3 max-h-72 overflow-y-auto scrollbar-thin">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && items.length === 0 && <p className="text-sm text-slate-500">No updates yet in this space.</p>}
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 border-b border-slate-50 pb-3">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
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
