import { useEffect, useState } from 'react'
import PersonTypeahead from './PersonTypeahead'

export default function PathFinder({ persons, onFindPath, defaultFromId }) {
  const [person1, setPerson1] = useState(defaultFromId || '')
  const [person2, setPerson2] = useState('')

  useEffect(() => {
    if (defaultFromId && !person1) setPerson1(defaultFromId)
  }, [defaultFromId, person1])

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4 sm:p-6 overflow-hidden">
      <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 flex items-center">
        <i className="fas fa-route mr-2 text-emerald-600" />
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
        className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        <i className="fas fa-search mr-2" />
        Find connection
      </button>
    </div>
  )
}
