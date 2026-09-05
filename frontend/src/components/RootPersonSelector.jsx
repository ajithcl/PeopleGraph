import { useRef, useState } from 'react'

export default function RootPersonSelector({ persons, rootPersonId, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef()

  const rootPerson = persons.find((p) => p.id === rootPersonId)
  const filtered =
    query.trim().length === 0
      ? persons
      : persons.filter(
          (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            (p.nickName && p.nickName.toLowerCase().includes(query.toLowerCase())),
        )

  const handleSelect = (person) => {
    onSelect(person.id)
    setQuery(person.name)
    setOpen(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 mb-6">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <i className="fas fa-sitemap text-indigo-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800 leading-tight">Root Person</h3>
          <p className="text-xs text-slate-400">Choose who appears at the center of the radial tree</p>
        </div>
        {rootPerson && (
          <div className="ml-auto flex items-center space-x-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5">
            <span className="text-xs font-semibold text-indigo-700">
              <i className="fas fa-star mr-1 text-amber-400" />
              {rootPerson.name}
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <i className="fas fa-search text-slate-400 text-sm" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search by name or nickname…"
          className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition outline-none"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden" style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {filtered.map((person) => (
              <div
                key={person.id}
                onMouseDown={() => handleSelect(person)}
                className={`flex items-center space-x-3 px-4 py-2.5 cursor-pointer transition ${
                  person.id === rootPersonId ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-slate-50 border-l-4 border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    person.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                  }`}
                >
                  {person.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{person.name}</p>
                  {person.nickName && <p className="text-xs text-slate-400 truncate">&quot;{person.nickName}&quot;</p>}
                </div>
                {person.id === rootPersonId && <i className="fas fa-check-circle text-indigo-500 text-sm flex-shrink-0 ml-auto" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
