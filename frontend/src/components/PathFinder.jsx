import { useEffect, useState } from 'react'
import PersonTypeahead from './PersonTypeahead'

export default function PathFinder({ persons, onFindPath, defaultFromId }) {
  const [person1, setPerson1] = useState(defaultFromId || '')
  const [person2, setPerson2] = useState('')

  useEffect(() => {
    if (defaultFromId && !person1) setPerson1(defaultFromId)
  }, [defaultFromId, person1])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 overflow-hidden">
      <h3 className="text-base font-semibold text-slate-800 mb-4">
        How are two people related?
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PersonTypeahead
          persons={persons}
          value={person1}
          onChange={setPerson1}
          label="From"
          excludeId={person2}
        />
        <PersonTypeahead
          persons={persons}
          value={person2}
          onChange={setPerson2}
          label="To"
          excludeId={person1}
        />
      </div>
      <button
        type="button"
        onClick={() => person1 && person2 && person1 !== person2 && onFindPath(person1, person2)}
        disabled={!person1 || !person2 || person1 === person2}
        className="w-full mt-4 btn-primary bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        Find connection
      </button>
    </div>
  )
}
