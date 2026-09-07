import { useState } from 'react'
import { apiBase } from '../api'

export default function PhotoAvatar({ person, size = 'md' }) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl',
    xl: 'w-32 h-32 text-5xl',
  }

  const colorClass = 'bg-indigo-50 text-indigo-700'
  const initials = (person?.name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  let photoUrl = person?.photoUrl
  if (photoUrl && photoUrl.startsWith('/uploads/')) {
    photoUrl = `${apiBase()}${photoUrl}`
  }

  if (photoUrl && !imageError) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden`}>
        <img src={photoUrl} alt={person.name} className="photo-avatar" onError={() => setImageError(true)} />
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full ${colorClass} flex items-center justify-center font-bold`}>
      {initials}
    </div>
  )
}
