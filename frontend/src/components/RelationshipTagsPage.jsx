import { useEffect, useState } from 'react'
import { api } from '../api'

const emptyForm = () => ({
  label: '',
  phraseForward: '',
  phraseReverse: '',
})

export default function RelationshipTagsPage({ canEdit, onBack, onChanged }) {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm())
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getRelationshipTags()
      setTags(data)
    } catch (err) {
      setError(err.message || 'Could not load relationship tags')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const addTag = async (e) => {
    e.preventDefault()
    if (!form.label.trim()) return
    setBusy(true)
    setError('')
    try {
      const result = await api.createRelationshipTag({
        label: form.label.trim(),
        phraseForward: form.phraseForward.trim(),
        phraseReverse: form.phraseReverse.trim(),
      })
      if (!result.success) throw new Error(result.error || 'Could not add tag')
      setForm(emptyForm())
      await load()
      onChanged?.()
    } catch (err) {
      setError(err.message || 'Could not add tag')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (tag) => {
    setEditingId(tag.id)
    setEditForm({
      label: tag.label || '',
      phraseForward: tag.phraseForward || '',
      phraseReverse: tag.phraseReverse || '',
    })
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!editingId || !editForm.label.trim()) return
    setBusy(true)
    setError('')
    try {
      const result = await api.updateRelationshipTag(editingId, {
        label: editForm.label.trim(),
        phraseForward: editForm.phraseForward.trim(),
        phraseReverse: editForm.phraseReverse.trim(),
      })
      if (!result.success) throw new Error(result.error || 'Could not update tag')
      setEditingId(null)
      await load()
      onChanged?.()
    } catch (err) {
      setError(err.message || 'Could not update tag')
    } finally {
      setBusy(false)
    }
  }

  const removeTag = async (tag) => {
    if (!confirm(`Delete the “${tag.label}” tag? This only works if no links use it.`)) return
    setBusy(true)
    setError('')
    try {
      const result = await api.deleteRelationshipTag(tag.id)
      if (!result.success) throw new Error(result.error || 'Could not delete tag')
      await load()
      onChanged?.()
    } catch (err) {
      setError(err.message || 'Could not delete tag')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            <i className="fas fa-tags mr-2 text-indigo-600" />
            Relationship tags
          </h2>
          <p className="text-slate-500 mt-1 text-sm">
            These names appear in Add Link. Built-in family types stay; you can add cousin, godparent, and similar.
          </p>
        </div>
        <button type="button" onClick={onBack} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-semibold hover:bg-slate-200">
          <i className="fas fa-sitemap mr-2" />
          Back to tree
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4">{error}</div>}

      {canEdit && (
        <form onSubmit={addTag} className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Add a custom tag</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Cousin"
                className="w-full p-3 border border-slate-200 rounded-xl bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">How related (from → to)</label>
              <input
                value={form.phraseForward}
                onChange={(e) => setForm({ ...form, phraseForward: e.target.value })}
                placeholder="{a} is a cousin of {b}"
                className="w-full p-3 border border-slate-200 rounded-xl bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">How related (reverse)</label>
              <input
                value={form.phraseReverse}
                onChange={(e) => setForm({ ...form, phraseReverse: e.target.value })}
                placeholder="{a} is a cousin of {b}"
                className="w-full p-3 border border-slate-200 rounded-xl bg-white"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">Use {'{a}'} and {'{b}'} for the two names in How am I related? explanations. Leave blank for a generic sentence.</p>
          <button type="submit" disabled={busy} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold disabled:bg-slate-300">
            Add tag
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading tags…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-semibold">Name</th>
                <th className="py-2 pr-3 font-semibold">Key</th>
                <th className="py-2 pr-3 font-semibold">Used</th>
                <th className="py-2 pr-3 font-semibold">Kind</th>
                {canEdit && <th className="py-2 font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-3">
                    {editingId === tag.id ? (
                      <form onSubmit={saveEdit} className="space-y-2 min-w-[16rem]">
                        <input
                          value={editForm.label}
                          onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                          className="w-full p-2 border border-slate-200 rounded-lg"
                          required
                        />
                        <input
                          value={editForm.phraseForward}
                          onChange={(e) => setEditForm({ ...editForm, phraseForward: e.target.value })}
                          className="w-full p-2 border border-slate-200 rounded-lg"
                          placeholder="{a} is … of {b}"
                        />
                        <input
                          value={editForm.phraseReverse}
                          onChange={(e) => setEditForm({ ...editForm, phraseReverse: e.target.value })}
                          className="w-full p-2 border border-slate-200 rounded-lg"
                          placeholder="Reverse phrase"
                        />
                        <div className="flex gap-2">
                          <button type="submit" disabled={busy} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
                            Save
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div>
                        <p className="font-semibold text-slate-800">{tag.label}</p>
                        {tag.phraseForward && <p className="text-xs text-slate-500 mt-1">{tag.phraseForward}</p>}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs text-slate-600">{tag.key}</td>
                  <td className="py-3 pr-3">{tag.usageCount}</td>
                  <td className="py-3 pr-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${tag.builtIn ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-800'}`}>
                      {tag.builtIn ? 'Built-in' : 'Custom'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="py-3">
                      {editingId !== tag.id && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => startEdit(tag)} className="text-indigo-700 font-semibold text-xs">
                            Edit
                          </button>
                          {!tag.builtIn && (
                            <button type="button" onClick={() => removeTag(tag)} className="text-red-600 font-semibold text-xs">
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
