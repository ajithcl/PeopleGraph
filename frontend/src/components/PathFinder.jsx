import { useState } from 'react'

export default function PathFinder({ persons, onFindPath }) {
  const [person1, setPerson1] = useState('')
  const [person2, setPerson2] = useState('')

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
        <i className="fas fa-route mr-2 text-emerald-600" />
        Relationship Path Finder
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
          <select value={person1} onChange={(e) => setPerson1(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg">
            <option value="">Select person...</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
          <select value={person2} onChange={(e) => setPerson2(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg">
            <option value="">Select person...</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={() => person1 && person2 && person1 !== person2 && onFindPath(person1, person2)}
        disabled={!person1 || !person2 || person1 === person2}
        className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        <i className="fas fa-search mr-2" />
        Find Connection Path
      </button>
    </div>
  )
}
