import PersonTypeahead from './PersonTypeahead'

export default function RootPersonSelector({ persons, rootPersonId, onSelect }) {
  const rootPerson = persons.find((p) => p.id === rootPersonId)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 leading-tight">Show family around</h3>
          <p className="text-xs text-slate-500">Center the tree on someone to see nearby relatives</p>
        </div>
        {rootPerson && (
          <span className="ml-auto hidden sm:inline text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg truncate max-w-[12rem]">
            {rootPerson.name}
          </span>
        )}
      </div>
      <PersonTypeahead persons={persons} value={rootPersonId} onChange={onSelect} placeholder="Search who to show at the center…" />
    </div>
  )
}
