import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { api, saveSession } from '../api'
import AccountSettingsModal from './AccountSettingsModal'
import ActivityFeed from './ActivityFeed'
import AddPersonModal from './AddPersonModal'
import AddRelationshipModal from './AddRelationshipModal'
import EditPersonModal from './EditPersonModal'
import FamilyTree from './FamilyTree'
import InviteMembersModal from './InviteMembersModal'
import PathFinder from './PathFinder'
import PersonProfile from './PersonProfile'
import PhotoAvatar from './PhotoAvatar'
import RelationshipTagsPage from './RelationshipTagsPage'
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
  const [showUnclaimConfirm, setShowUnclaimConfirm] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [highlightPath, setHighlightPath] = useState(null)
  const [pathResult, setPathResult] = useState(null)
  const [pathExplanation, setPathExplanation] = useState(null)
  const [pathError, setPathError] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [error, setError] = useState(null)
  const [rootPersonId, setRootPersonId] = useState(session.personId || null)
  const [generations, setGenerations] = useState(2)
  const [mainView, setMainView] = useState('tree')
  const [relTags, setRelTags] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const canEdit = session.role === 'owner' || session.role === 'editor'
  const spaceName = (session.spaces || []).find((s) => s.id === session.spaceId)?.name || 'Kinship space'

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [personsData, relationshipsData, statsData, tagsData] = await Promise.all([
        api.getAllPersons(),
        api.getRelationships(),
        api.getStats(),
        api.getRelationshipTags().catch(() => []),
      ])
      setPersons(personsData)
      setRelationships(relationshipsData)
      setStats(statsData)
      setRelTags(tagsData)
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

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDoc = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const filteredPersons = persons.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.nickName && p.nickName.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const handleNodeClick = useCallback((node) => {
    setSelectedPerson(node)
    setShowProfile(true)
  }, [])

  const handleSearchSelect = (person) => {
    setRootPersonId(person.id)
    setSelectedPerson(person)
    setShowProfile(true)
    setSearchTerm('')
  }

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
    setPathError('')
    try {
      const pathData = await api.findShortestPath(personId1, personId2)
      if (pathData?.nodeIds?.length) {
        setHighlightPath(pathData.nodeIds)
        setPathResult(pathData.nodeIds.map((id) => persons.find((p) => p.id === id)).filter(Boolean))
        setPathExplanation(pathData.explanation || null)
        setRootPersonId(personId1)
        setGenerations((prev) => Math.max(prev, Math.min(4, (pathData.nodeIds.length || 1) - 1)))
      } else {
        setHighlightPath(null)
        setPathResult([])
        setPathExplanation(null)
      }
    } catch {
      setPathError('Could not find a connection. Try two people in this family.')
    }
  }

  const handleHowRelated = (person) => {
    if (!session.personId) return
    setShowProfile(false)
    handleFindPath(session.personId, person.id)
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
      setError(err.message || 'Could not switch space')
    }
  }

  const confirmUnclaim = async () => {
    try {
      await api.unclaimPerson()
      const next = { ...session, personId: null, personName: null, needsClaim: true }
      saveSession(next)
      onSessionUpdate(next)
    } catch (err) {
      setError(err.message || 'Could not change who you are')
      setShowUnclaimConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading family…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Could not load family</h2>
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
    <div className="min-h-screen p-3 sm:p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div className="min-w-0 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold tracking-tight flex-shrink-0">
                P
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">PeopleGraph</h1>
                <p className="text-slate-500 mt-0.5 text-sm break-words">
                  {spaceName}
                  {' · '}
                  {persons.length} {persons.length === 1 ? 'person' : 'people'}
                  {stats.totalRelationships != null && (
                    <>
                      {' · '}
                      {stats.totalRelationships} {stats.totalRelationships === 1 ? 'link' : 'links'}
                    </>
                  )}
                  {session.personName && (
                    <>
                      {' · '}
                      You are <strong className="text-slate-700 font-semibold">{session.personName}</strong>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {session.role === 'owner' && (
                <button type="button" onClick={() => setShowInviteModal(true)} className="bg-white border border-slate-200 text-slate-700 px-3 sm:px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-50 text-sm">
                  Invite
                </button>
              )}
              {canEdit && (
                <>
                  <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary bg-indigo-600 text-white px-3 sm:px-4 py-2.5 rounded-xl font-semibold text-sm">
                    Add
                  </button>
                  <button type="button" onClick={() => setShowAddRelationshipModal(true)} className="bg-white border border-slate-200 text-slate-700 px-3 sm:px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-50 text-sm">
                    Link
                  </button>
                </>
              )}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="bg-white border border-slate-200 text-slate-700 px-3 sm:px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-50 text-sm"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  More
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-40" role="menu">
                    {(session.spaces || []).length > 1 && (
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-xs font-medium text-slate-400 mb-1">Family</p>
                        <select
                          value={session.spaceId}
                          onChange={(e) => {
                            switchSpace(e.target.value)
                            setMenuOpen(false)
                          }}
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                        >
                          {session.spaces.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        setShowUnclaimConfirm(true)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Who I am
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        setMainView((v) => (v === 'tags' ? 'tree' : 'tags'))
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {mainView === 'tags' ? 'Family tree' : 'Relationship tags'}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        setShowAccount(true)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Account
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        onLogout()
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 border-t border-slate-100"
                    >
                      Sign out
                      {session.user?.name || session.user?.email ? (
                        <span className="block text-xs text-slate-400 truncate mt-0.5">
                          {session.user?.name || session.user?.email}
                        </span>
                      ) : null}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {mainView === 'tree' && (
          <>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or nickname..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3.5 pl-11 border border-slate-200 rounded-xl focus:border-indigo-500 text-slate-800 bg-slate-50/60"
            />
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {searchTerm && (
            <div className="mt-4 max-h-60 overflow-y-auto scrollbar-thin bg-slate-50 rounded-xl border border-slate-100 p-2">
              {filteredPersons.length === 0 ? (
                <p className="p-4 text-center text-slate-500">No matches for &quot;{searchTerm}&quot;</p>
              ) : (
                filteredPersons.map((person) => (
                  <div key={person.id} onClick={() => handleSearchSelect(person)} className="p-3 hover:bg-white cursor-pointer rounded-lg flex items-center space-x-3">
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
          </>
          )}
        </div>
      </div>

      {mainView === 'tags' ? (
        <div className="max-w-7xl mx-auto mb-6">
          <RelationshipTagsPage
            canEdit={canEdit}
            onBack={() => setMainView('tree')}
            onChanged={async () => {
              try {
                setRelTags(await api.getRelationshipTags())
              } catch {
                /* keep existing tags */
              }
            }}
          />
        </div>
      ) : (
      <>
      <div className="max-w-7xl mx-auto mb-6 space-y-4">
        <PathFinder persons={persons} defaultFromId={session.personId} onFindPath={handleFindPath} />
        {pathError && <p className="text-sm text-red-600 bg-white rounded-xl p-3">{pathError}</p>}
        {pathResult && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 overflow-hidden">
            {pathResult.length > 0 ? (
              <div>
                <h4 className="text-base font-semibold text-slate-800 mb-2">
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
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {pathResult.map((person, idx) => (
                    <Fragment key={person.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setRootPersonId(person.id)
                          setSelectedPerson(person)
                          setShowProfile(true)
                        }}
                        className="flex-shrink-0 text-center"
                      >
                        <PhotoAvatar person={person} size="md" />
                        <p className="text-sm font-semibold text-slate-800 max-w-[100px] truncate mt-2">{person.name}</p>
                      </button>
                      {idx < pathResult.length - 1 && <span className="text-slate-300 flex-shrink-0">→</span>}
                    </Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-600 py-2">
                <p className="font-semibold">No connection found between those people</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        {persons.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
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
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm font-medium text-slate-600">Generations to show</span>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setGenerations(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${
                    generations === n
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <RootPersonSelector persons={persons} rootPersonId={rootPersonId} onSelect={setRootPersonId} />
            <FamilyTree
              data={{ nodes: persons, relationships }}
              onNodeClick={handleNodeClick}
              highlightPath={highlightPath}
              rootPersonId={rootPersonId}
              generations={generations}
            />
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        <ActivityFeed refreshKey={`${persons.length}-${relationships.length}`} />
      </div>
      </>
      )}

      {showProfile && (
        <PersonProfile
          person={selectedPerson}
          onClose={() => setShowProfile(false)}
          onEdit={canEdit ? handleEdit : null}
          canEdit={canEdit}
          selfPersonId={session.personId}
          onHowRelated={session.personId ? handleHowRelated : null}
          relTags={relTags}
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
      {showAddRelationshipModal && canEdit && (
        <AddRelationshipModal
          persons={persons}
          tags={relTags}
          onClose={() => setShowAddRelationshipModal(false)}
          onSave={loadData}
        />
      )}
      {showInviteModal && <InviteMembersModal role={session.role} onClose={() => setShowInviteModal(false)} />}
      {showAccount && (
        <AccountSettingsModal
          session={session}
          onClose={() => setShowAccount(false)}
          onSessionUpdate={onSessionUpdate}
        />
      )}

      {showUnclaimConfirm && (
        <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="modal-content bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Change who you are?</h2>
            <p className="text-sm text-slate-600 mb-6">
              {session.personName
                ? `You are currently listed as ${session.personName}. Choosing someone else unlinks this account from that person (the listing stays in the family).`
                : 'You will pick a different listing in this family.'}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUnclaimConfirm(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold">
                Cancel
              </button>
              <button type="button" onClick={confirmUnclaim} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold">
                Choose again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
