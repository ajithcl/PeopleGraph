import { Fragment, useCallback, useEffect, useState } from 'react'
import { api, saveSession } from '../api'
import AddPersonModal from './AddPersonModal'
import AddRelationshipModal from './AddRelationshipModal'
import EditPersonModal from './EditPersonModal'
import FamilyTree from './FamilyTree'
import InviteMembersModal from './InviteMembersModal'
import PathFinder from './PathFinder'
import PersonProfile from './PersonProfile'
import PhotoAvatar from './PhotoAvatar'
import RootPersonSelector from './RootPersonSelector'

export default function KinshipApp({ session, onLogout, onSessionUpdate }) {
  const [persons, setPersons] = useState([])
  const [relationships, setRelationships] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showAddRelationshipModal, setShowAddRelationshipModal] = useState(false)
  const [highlightPath, setHighlightPath] = useState(null)
  const [pathResult, setPathResult] = useState(null)
  const [pathExplanation, setPathExplanation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [error, setError] = useState(null)
  const [rootPersonId, setRootPersonId] = useState(session.personId || null)

  const canEdit = session.role === 'owner' || session.role === 'editor'
  const spaceName = (session.spaces || []).find((s) => s.id === session.spaceId)?.name || 'Kinship space'

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [personsData, relationshipsData, statsData] = await Promise.all([
        api.getAllPersons(),
        api.getRelationships(),
        api.getStats(),
      ])
      setPersons(personsData)
      setRelationships(relationshipsData)
      setStats(statsData)
      setRootPersonId((prev) => prev || session.personId || personsData[0]?.id || null)
    } catch (err) {
      if (err.status === 401) {
        onLogout()
        return
      }
      setError(err.message || 'Failed to load kinship graph. Is the server running?')
    } finally {
      setLoading(false)
    }
  }, [session.personId, onLogout])

  useEffect(() => {
    api.setAuth(session.token, session.spaceId)
    loadData()
  }, [session.token, session.spaceId, loadData])

  const filteredPersons = persons.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.nickName && p.nickName.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const handleNodeClick = useCallback((node) => {
    setSelectedPerson(node)
    setShowProfile(true)
  }, [])

  const handleEdit = (person) => {
    if (!canEdit) return
    setShowProfile(false)
    setSelectedPerson(person)
    setShowEditModal(true)
  }

  const handleSave = async (personId, formData) => {
    await api.updatePerson(personId, formData)
    await loadData()
  }

  const handleAddPerson = async (formData, selectedFile) => {
    const result = await api.createPerson(formData)
    if (!result.success) throw new Error(result.error || 'Failed to create person')
    const newPersonId = result.data?.id
    if (newPersonId && selectedFile) {
      const uploadResult = await api.uploadPhoto(newPersonId, selectedFile)
      if (!uploadResult?.success) throw new Error(uploadResult?.error || 'Photo upload failed')
    }
    await loadData()
  }

  const handleFindPath = async (personId1, personId2) => {
    try {
      const pathData = await api.findShortestPath(personId1, personId2)
      if (pathData?.nodeIds?.length) {
        setHighlightPath(pathData.nodeIds)
        setPathResult(pathData.nodeIds.map((id) => persons.find((p) => p.id === id)).filter(Boolean))
        setPathExplanation(pathData.explanation || null)
      } else {
        setHighlightPath(null)
        setPathResult([])
        setPathExplanation(null)
      }
    } catch {
      alert('Failed to find path')
    }
  }

  const switchSpace = async (spaceId) => {
    const space = (session.spaces || []).find((s) => s.id === spaceId)
    if (!space) return
    try {
      api.setAuth(session.token, spaceId)
      const me = await api.me(spaceId)
      const claim = me.data || {}
      const next = {
        ...session,
        spaceId,
        role: space.role,
        personId: claim.personId || null,
        personName: claim.personName || null,
        needsClaim: !!claim.needsClaim,
      }
      saveSession(next)
      onSessionUpdate(next)
    } catch (err) {
      alert(err.message || 'Could not switch space')
    }
  }

  const changeWhoIAm = () => {
    const next = { ...session, personId: null, personName: null, needsClaim: true }
    saveSession(next)
    onSessionUpdate(next)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4" />
          <p className="text-white text-xl font-semibold">Loading kinship graph…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-8 max-w-md text-center">
          <i className="fas fa-exclamation-triangle text-6xl text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Could not load graph</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="flex gap-3">
            <button type="button" onClick={loadData} className="btn-primary flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold">
              Retry
            </button>
            <button type="button" onClick={onLogout} className="flex-1 bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold">
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 flex items-center">
                <i className="fas fa-sitemap mr-3 text-indigo-600" />
                PeopleGraph
              </h1>
              <p className="text-slate-500 mt-1 font-medium">
                {spaceName} · {persons.length} member{persons.length !== 1 ? 's' : ''} · you are{' '}
                <span className="capitalize">{session.role}</span>
                {session.personName && (
                  <>
                    {' '}
                    · graph profile: <strong className="text-slate-700">{session.personName}</strong>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {(session.spaces || []).length > 1 && (
                <select value={session.spaceId} onChange={(e) => switchSpace(e.target.value)} className="p-3 border border-slate-200 rounded-xl text-sm">
                  {session.spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              )}
              <button type="button" onClick={changeWhoIAm} className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-semibold hover:bg-slate-50 text-sm">
                <i className="fas fa-id-card mr-2" />
                Who I am
              </button>
              {session.role === 'owner' && (
                <button type="button" onClick={() => setShowInviteModal(true)} className="bg-white border border-indigo-200 text-indigo-700 px-4 py-3 rounded-xl font-semibold hover:bg-indigo-50">
                  <i className="fas fa-user-plus mr-2" />
                  Invite
                </button>
              )}
              {canEdit && (
                <>
                  <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary bg-indigo-600 text-white px-4 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-500/25">
                    <i className="fas fa-plus mr-2" />
                    Add Member
                  </button>
                  <button type="button" onClick={() => setShowAddRelationshipModal(true)} className="btn-primary bg-emerald-600 text-white px-4 py-3 rounded-xl font-semibold">
                    <i className="fas fa-link mr-2" />
                    Add Link
                  </button>
                </>
              )}
              <button type="button" onClick={onLogout} className="text-slate-500 hover:text-slate-800 px-3 py-3 text-sm font-medium">
                <i className="fas fa-sign-out-alt mr-1" />
                {session.user?.name || session.user?.email}
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or nickname..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-4 pl-12 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-slate-800"
            />
            <i className="fas fa-search absolute left-4 top-5 text-slate-400 text-xl" />
          </div>

          {searchTerm && (
            <div className="mt-4 max-h-60 overflow-y-auto scrollbar-thin bg-slate-50 rounded-xl border border-slate-100 p-2">
              {filteredPersons.length === 0 ? (
                <p className="p-4 text-center text-slate-500">No matches for &quot;{searchTerm}&quot;</p>
              ) : (
                filteredPersons.map((person) => (
                  <div key={person.id} onClick={() => handleNodeClick(person)} className="p-3 hover:bg-white cursor-pointer rounded-lg flex items-center space-x-3">
                    <PhotoAvatar person={person} size="sm" />
                    <div>
                      <p className="font-semibold text-slate-800">{person.name}</p>
                      {person.nickName && <p className="text-sm text-slate-500">&quot;{person.nickName}&quot;</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        <PathFinder persons={persons} onFindPath={handleFindPath} />
        {pathResult && (
          <div className="mt-4 bg-white rounded-xl shadow-lg border border-slate-100 p-6">
            {pathResult.length > 0 ? (
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">
                  <i className="fas fa-check-circle mr-2 text-green-600" />
                  How they connect
                  {pathExplanation?.degree != null && (
                    <span className="ml-2 text-sm font-medium text-slate-500">
                      ({pathExplanation.degree} hop{pathExplanation.degree !== 1 ? 's' : ''})
                    </span>
                  )}
                </h4>
                {pathExplanation?.summary && (
                  <p className="text-slate-700 bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4 leading-relaxed">{pathExplanation.summary}</p>
                )}
                {pathExplanation?.hops?.length > 0 && (
                  <ol className="mb-4 space-y-2">
                    {pathExplanation.hops.map((hop, idx) => (
                      <li key={idx} className="flex items-start text-sm text-slate-600">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold mr-2">{idx + 1}</span>
                        {hop}
                      </li>
                    ))}
                  </ol>
                )}
                <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                  {pathResult.map((person, idx) => (
                    <Fragment key={person.id}>
                      <div className="flex-shrink-0 text-center">
                        <PhotoAvatar person={person} size="md" />
                        <p className="text-sm font-semibold text-gray-800 max-w-[100px] truncate mt-2">{person.name}</p>
                      </div>
                      {idx < pathResult.length - 1 && <i className="fas fa-arrow-right text-2xl text-gray-400 flex-shrink-0" />}
                    </Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-600">
                <i className="fas fa-times-circle text-4xl text-red-500 mb-2" />
                <p className="font-semibold">No connection found between selected persons</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        {persons.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">No people in this space yet</h3>
            <p className="text-slate-500 mb-6">Add relatives and connect them so everyone can see how they relate.</p>
            {canEdit && (
              <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold">
                Add First Member
              </button>
            )}
          </div>
        ) : (
          <>
            <RootPersonSelector persons={persons} rootPersonId={rootPersonId} onSelect={setRootPersonId} />
            <FamilyTree data={{ nodes: persons, relationships }} onNodeClick={handleNodeClick} highlightPath={highlightPath} rootPersonId={rootPersonId} />
          </>
        )}
      </div>

      {showProfile && (
        <PersonProfile
          person={selectedPerson}
          onClose={() => setShowProfile(false)}
          onEdit={canEdit ? handleEdit : null}
          canEdit={canEdit}
          onDeleteRelationship={
            canEdit
              ? async (rel) => {
                  const result = await api.deleteRelationship(rel)
                  if (!result.success) {
                    alert(result.error || 'Failed to delete relationship')
                    return
                  }
                  await loadData()
                }
              : null
          }
          relationships={relationships}
          allPersons={persons}
        />
      )}
      {showEditModal && canEdit && <EditPersonModal person={selectedPerson} onClose={() => setShowEditModal(false)} onSave={handleSave} />}
      {showAddModal && canEdit && <AddPersonModal onClose={() => setShowAddModal(false)} onSave={handleAddPerson} />}
      {showAddRelationshipModal && canEdit && <AddRelationshipModal persons={persons} onClose={() => setShowAddRelationshipModal(false)} onSave={loadData} />}
      {showInviteModal && <InviteMembersModal role={session.role} onClose={() => setShowInviteModal(false)} />}

      <div className="max-w-7xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: 'fa-users', color: 'text-indigo-600', value: stats.totalPersons || 0, label: 'Total Members' },
          { icon: 'fa-mars', color: 'text-blue-500', value: stats.maleCount || 0, label: 'Male Members' },
          { icon: 'fa-venus', color: 'text-pink-500', value: stats.femaleCount || 0, label: 'Female Members' },
          { icon: 'fa-link', color: 'text-emerald-500', value: stats.totalRelationships || 0, label: 'Relationships' },
        ].map((s) => (
          <div key={s.label} className="card-hover bg-white rounded-xl shadow-lg border border-slate-100 p-6 text-center">
            <i className={`fas ${s.icon} text-4xl ${s.color} mb-2`} />
            <p className="text-3xl font-bold text-slate-800">{s.value}</p>
            <p className="text-slate-500 text-sm font-medium">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
