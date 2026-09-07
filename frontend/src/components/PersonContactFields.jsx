export default function PersonContactFields({ formData, onChange, compact = false }) {
  const fieldClass = compact
    ? 'w-full p-3 border border-slate-200 rounded-xl'
    : 'w-full p-3 border border-gray-300 rounded-lg'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input name="phone" type="tel" value={formData.phone || ''} onChange={onChange} className={fieldClass} placeholder="+91 …" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input name="email" type="email" value={formData.email || ''} onChange={onChange} className={fieldClass} placeholder="name@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
          <input
            name="facebookId"
            value={formData.facebookId || ''}
            onChange={onChange}
            className={fieldClass}
            placeholder="username, id, or facebook.com/…"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
          <input name="instagram" value={formData.instagram || ''} onChange={onChange} className={fieldClass} placeholder="handle or instagram.com/…" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
          <input
            name="linkedin"
            value={formData.linkedin || ''}
            onChange={onChange}
            className={fieldClass}
            placeholder="username or linkedin.com/in/…"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          name="notes"
          value={formData.notes || ''}
          onChange={onChange}
          rows={compact ? 3 : 4}
          className={fieldClass}
          placeholder="Anything the family should remember"
        />
      </div>
    </div>
  )
}
