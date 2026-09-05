import { useEffect, useRef, useState } from 'react'
import { api, apiBase } from '../api'

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

export default function EditPersonModal({ person, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: person.name || '',
    nickName: person.nickName || '',
    gender: person.gender || 'male',
    dateOfBirth: person.dateOfBirth || '',
    photoUrl: person.photoUrl || '',
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadMode, setUploadMode] = useState('upload')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (person.photoUrl) {
      setPreviewUrl(person.photoUrl.startsWith('/uploads/') ? `${apiBase()}${person.photoUrl}` : person.photoUrl)
      setFormData((fd) => ({ ...fd, photoUrl: person.photoUrl }))
    } else {
      setPreviewUrl(null)
    }
  }, [person.photoUrl])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleFile = (file) => {
    if (!file) return
    if (!ALLOWED.includes(file.type)) {
      alert('Please select a valid image file (JPG, PNG, GIF, or WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreviewUrl(reader.result)
    reader.readAsDataURL(file)
  }

  const handleDeletePhoto = async () => {
    if (!confirm('Are you sure you want to delete this photo?')) return
    setSaving(true)
    try {
      await api.deletePhoto(person.id)
      await onSave(person.id, { photoUrl: '' })
      setPreviewUrl(null)
      setSelectedFile(null)
      setFormData({ ...formData, photoUrl: '' })
    } catch (error) {
      alert('Failed to delete photo: ' + (error.message || error))
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      let uploadedPhotoUrl = null
      if (selectedFile && uploadMode === 'upload') {
        const uploadResult = await api.uploadPhoto(person.id, selectedFile)
        uploadedPhotoUrl = uploadResult?.data?.photoUrl || uploadResult?.photoUrl || uploadResult?.url || null
        if (!uploadedPhotoUrl && !(uploadResult && uploadResult.success)) {
          throw new Error(uploadResult?.error || 'Photo upload failed')
        }
      }
      const updateData = { ...formData }
      if (uploadedPhotoUrl) updateData.photoUrl = uploadedPhotoUrl
      await onSave(person.id, updateData)
      onClose()
    } catch (error) {
      alert('Failed to save: ' + (error.message || error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="modal-content bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">
            <i className="fas fa-edit mr-2 text-indigo-600" />
            Edit Person
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl" aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
            <input name="name" value={formData.name} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nickname</label>
            <input name="nickName" value={formData.nickName} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
              <select name="gender" value={formData.gender} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-lg">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <i className="fas fa-camera mr-2" />
              Profile Photo
            </label>
            <div className="flex space-x-2 mb-4">
              <button type="button" onClick={() => setUploadMode('upload')} className={`flex-1 py-2 rounded-lg font-semibold ${uploadMode === 'upload' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                Upload File
              </button>
              <button type="button" onClick={() => setUploadMode('url')} className={`flex-1 py-2 rounded-lg font-semibold ${uploadMode === 'url' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                Photo URL
              </button>
            </div>

            {uploadMode === 'upload' ? (
              <div
                className={`upload-zone rounded-lg p-8 text-center cursor-pointer ${dragOver ? 'drag-over' : ''}`}
                onClick={() => fileInputRef.current.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  handleFile(e.dataTransfer.files[0])
                }}
              >
                <i className="fas fa-cloud-upload-alt text-5xl text-gray-400 mb-3" />
                <p className="text-gray-600 font-semibold">Click to upload or drag and drop</p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFile(e.target.files[0])} className="hidden" />
              </div>
            ) : (
              <input type="url" name="photoUrl" value={formData.photoUrl} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
            )}

            {previewUrl && (
              <div className="mt-4 flex items-center space-x-4">
                <img src={previewUrl} alt="Preview" className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200" />
                {person.photoUrl && (
                  <button type="button" onClick={handleDeletePhoto} disabled={saving} className="text-red-600 font-semibold">
                    <i className="fas fa-trash mr-2" />
                    Delete Photo
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-6 border-t">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold disabled:bg-gray-400">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
