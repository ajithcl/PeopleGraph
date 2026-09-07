import { useEffect, useState } from 'react'
import { api } from '../api'
import PhotoAvatar from './PhotoAvatar'

export default function AddRelationshipModal({ persons, tags = [], onClose, onSave }) {
  const [fromPersonId, setFromPersonId] = useState('')
  const [toPersonId, setToPersonId] = useState('')
  const [relationshipType, setRelationshipType] = useState('')
  const [saving, setSaving] = useState(false)
  const [fromSearchQuery, setFromSearchQuery] = useState('')
  const [toSearchQuery, setToSearchQuery] = useState('')
  const [showFromDropdown, setShowFromDropdown] = useState(false)
  const [showToDropdown, setShowToDropdown] = useState(false)
  const [catalog, setCatalog] = useState(tags)

  useEffect(() => {
    if (tags.length) {
      setCatalog(tags)
      return
    }
    api.getRelationshipTags().then((data) => setCatalog(data || [])).catch(() => setCatalog([]))
  }, [tags])

  useEffect(() => {
    if (!relationshipType && catalog.length) {
      setRelationshipType(catalog.find((t) => t.key === 'HAS_CHILD')?.key || catalog[0].key)
    }
  }, [catalog, relationshipType])

  const filterPersons = (q, excludeId) => {
    const base = excludeId ? persons.filter((p) => p.id !== excludeId) : persons
    if (!q.trim()) return base
    const lower = q.toLowerCase()
    return base.filter((p) => p.name.toLowerCase().includes(lower) || (p.nickName && p.nickName.toLowerCase().includes(lower)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fromPersonId || !toPersonId || !relationshipType) {
      alert('Please fill in all fields')
      return
    }
    setSaving(true)
    try {
      const result = await api.createRelationship({ fromId: fromPersonId, toId: toPersonId, type: relationshipType })
      if (!result.success) throw new Error(result.error || 'Failed to create relationship')
      await onSave()
      onClose()
    } catch (error) {
      alert('Failed to add relationship: ' + (error.message || error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="modal-content bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Add relationship</h2>
            <p className="text-slate-500 mt-1">Create a new relationship between two family members</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">From Person</label>
            <div className="relative">
              <input
                type="text"
                value={fromSearchQuery}
                onChange={(e) => setFromSearchQuery(e.target.value)}
                onFocus={() => setShowFromDropdown(true)}
                placeholder="Search person..."
                className="w-full p-3 border-2 border-slate-200 rounded-lg"
              />
              {showFromDropdown && filterPersons(fromSearchQuery).length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filterPersons(fromSearchQuery).map((person) => (
                    <div
                      key={person.id}
                      onClick={() => {
                        setFromPersonId(person.id)
                        setFromSearchQuery(person.name)
                        setShowFromDropdown(false)
                      }}
                      className="p-3 hover:bg-indigo-50 cursor-pointer flex items-center space-x-3"
                    >
                      <PhotoAvatar person={person} size="sm" />
                      <p className="font-semibold text-slate-800">{person.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Relationship Type</label>
            <select value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-lg">
              {catalog.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">To Person</label>
            <div className="relative">
              <input
                type="text"
                value={toSearchQuery}
                onChange={(e) => setToSearchQuery(e.target.value)}
                onFocus={() => setShowToDropdown(true)}
                placeholder="Search person..."
                className="w-full p-3 border-2 border-slate-200 rounded-lg"
              />
              {showToDropdown && filterPersons(toSearchQuery, fromPersonId).length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filterPersons(toSearchQuery, fromPersonId).map((person) => (
                    <div
                      key={person.id}
                      onClick={() => {
                        setToPersonId(person.id)
                        setToSearchQuery(person.name)
                        setShowToDropdown(false)
                      }}
                      className="p-3 hover:bg-indigo-50 cursor-pointer flex items-center space-x-3"
                    >
                      <PhotoAvatar person={person} size="sm" />
                      <p className="font-semibold text-slate-800">{person.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-3 pt-6 border-t">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-3 text-slate-700 font-semibold border-2 border-slate-200 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving || !fromPersonId || !toPersonId || !relationshipType} className="flex-1 px-4 py-3 btn-primary bg-indigo-600 text-white font-semibold rounded-xl disabled:bg-slate-300">
              {saving ? 'Saving…' : 'Save Relationship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
