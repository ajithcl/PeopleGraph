import PhotoAvatar from './PhotoAvatar'

export default function PersonProfile({ person, onClose, onEdit, onDeleteRelationship, canEdit, relationships, allPersons }) {
  if (!person) return null

  const calculateAge = (dob) => {
    if (!dob) return 'Unknown'
    return new Date().getFullYear() - new Date(dob).getFullYear()
  }

  const rels = relationships
    .filter((r) => r.from === person.id || r.to === person.id)
    .map((r) => {
      const relatedPersonId = r.from === person.id ? r.to : r.from
      return {
        type: r.type,
        person: allPersons.find((p) => p.id === relatedPersonId),
        fromId: r.from,
        toId: r.to,
      }
    })

  const handleDeleteRel = async (rel) => {
    if (!onDeleteRelationship) return
    if (!confirm(`Remove ${rel.type.replace(/_/g, ' ')} link with ${rel.person?.name || 'this person'}?`)) return
    await onDeleteRelationship({ fromId: rel.fromId, toId: rel.toId, type: rel.type })
  }

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="modal-content bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className={`p-6 ${person.gender === 'male' ? 'bg-blue-50/80' : 'bg-pink-50/80'}`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <PhotoAvatar person={person} size="xl" />
              <div>
                <h2 className="text-3xl font-bold text-slate-800">{person.name}</h2>
                {person.nickName && <p className="text-lg text-slate-600 italic">&quot;{person.nickName}&quot;</p>}
              </div>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl" aria-label="Close">
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
              <p className="text-lg font-semibold text-gray-800">
                {person.dateOfBirth ? new Date(person.dateOfBirth).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Age</p>
              <p className="text-lg font-semibold text-gray-800">{calculateAge(person.dateOfBirth)} years</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Gender</p>
              <p className="text-lg font-semibold text-gray-800 capitalize">{person.gender}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">ID</p>
              <p className="text-xs font-mono text-gray-600 break-all">{person.id}</p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              <i className="fas fa-users mr-2 text-indigo-600" />
              Relationships
            </h3>
            <div className="space-y-2">
              {rels.length > 0 ? (
                rels.map((rel, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-indigo-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <PhotoAvatar person={rel.person} size="sm" />
                      <div>
                        <span className="font-semibold text-gray-800">{rel.person?.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({rel.type.replace(/_/g, ' ')})</span>
                      </div>
                    </div>
                    {canEdit && onDeleteRelationship && (
                      <button type="button" onClick={() => handleDeleteRel(rel)} className="text-red-500 hover:text-red-700 text-sm px-2" title="Remove relationship">
                        <i className="fas fa-unlink" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No relationships found</p>
              )}
            </div>
          </div>

          {onEdit && (
            <div className="flex space-x-3 pt-4 border-t">
              <button type="button" onClick={() => onEdit(person)} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700">
                <i className="fas fa-edit mr-2" />
                Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
