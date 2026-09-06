import { useRef, useState } from 'react'
import PhotoAvatar from './PhotoAvatar'

export default function PersonTypeahead({
  persons,
  value,
  onChange,
  placeholder = 'Search by name or nickname…',
  label,
  excludeId,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  const selected = persons.find((p) => p.id === value)
  const filtered = persons
    .filter((p) => p.id !== excludeId)
    .filter((p) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.nickName && p.nickName.toLowerCase().includes(q))
      )
    })
    .slice(0, 40)

  const display = open ? query : selected?.name || query

  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <i className="fas fa-search text-slate-400 text-sm" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={display}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value) onChange('')
          }}
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition outline-none"
        />
        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-3 text-sm text-slate-500">No matching people</p>
            ) : (
              filtered.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onMouseDown={() => {
                    onChange(person.id)
                    setQuery(person.name)
                    setOpen(false)
                  }}
                  className={`w-full text-left flex items-center space-x-3 px-4 py-2.5 ${
                    person.id === value ? 'bg-indigo-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <PhotoAvatar person={person} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{person.name}</p>
                    {person.nickName && <p className="text-xs text-slate-400 truncate">&quot;{person.nickName}&quot;</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
