import { useRef, useState } from 'react'

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

export default function AddPersonModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({ name: '', nickName: '', gender: 'male', dateOfBirth: '', photoUrl: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadMode, setUploadMode] = useState('upload')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

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

  const clearPhoto = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setFormData({ ...formData, photoUrl: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(formData, selectedFile)
      onClose()
    } catch (error) {
      alert('Failed to add member: ' + (error.message || error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="modal-content bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">
            <i className="fas fa-user-plus mr-2 text-indigo-600" />
            Add Member
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl" aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
            <input name="name" value={formData.name} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-lg" placeholder="John Doe" />
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
              Profile Photo (optional)
            </label>
            <div className="flex space-x-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setUploadMode('upload')
                  clearPhoto()
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold ${uploadMode === 'upload' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadMode('url')
                  setSelectedFile(null)
                  setPreviewUrl(null)
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold ${uploadMode === 'url' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
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
                <p className="text-gray-600 font-semibold mb-1">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">PNG, JPG, GIF or WebP (max 5MB)</p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFile(e.target.files[0])} className="hidden" />
              </div>
            ) : (
              <input type="url" name="photoUrl" value={formData.photoUrl} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="https://example.com/photo.jpg" />
            )}

            {previewUrl && <img src={previewUrl} alt="Preview" className="mt-4 w-32 h-32 rounded-lg object-cover border-2 border-gray-200" />}
            {uploadMode === 'url' && formData.photoUrl && (
              <img src={formData.photoUrl} alt="Preview" className="mt-4 w-32 h-32 rounded-lg object-cover border-2 border-gray-200" onError={(e) => { e.target.style.display = 'none' }} />
            )}
          </div>

          <div className="flex space-x-3 pt-6 border-t">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold disabled:bg-slate-400">
              {saving ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
