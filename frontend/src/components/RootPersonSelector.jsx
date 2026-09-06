import PersonTypeahead from './PersonTypeahead'

export default function RootPersonSelector({ persons, rootPersonId, onSelect }) {
  const rootPerson = persons.find((p) => p.id === rootPersonId)

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 sm:p-5 mb-6">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <i className="fas fa-sitemap text-indigo-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-800 leading-tight">Show family around</h3>
          <p className="text-xs text-slate-400">Center the tree on someone to see nearby relatives</p>
        </div>
        {rootPerson && (
          <div className="ml-auto hidden sm:flex items-center space-x-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5 max-w-[12rem]">
            <span className="text-xs font-semibold text-indigo-700 truncate">
              <i className="fas fa-star mr-1 text-amber-400" />
              {rootPerson.name}
            </span>
          </div>
        )}
      </div>
      <PersonTypeahead persons={persons} value={rootPersonId} onChange={onSelect} placeholder="Search who to show at the center…" />
    </div>
  )
}
