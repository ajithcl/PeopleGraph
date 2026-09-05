const REL_COLORS = {
  HAS_CHILD: { stroke: '#6366f1', label: '#6366f1', bg: '#eef2ff' },
  PARENT_OF: { stroke: '#3b82f6', label: '#3b82f6', bg: '#eff6ff' },
  SPOUSE_OF: { stroke: '#ec4899', label: '#ec4899', bg: '#fdf2f8' },
  SIBLING: { stroke: '#f59e0b', label: '#f59e0b', bg: '#fffbeb' },
  SIBLING_OF: { stroke: '#f59e0b', label: '#f59e0b', bg: '#fffbeb' },
  FRIEND: { stroke: '#10b981', label: '#10b981', bg: '#ecfdf5' },
  FRIEND_OF: { stroke: '#10b981', label: '#10b981', bg: '#ecfdf5' },
  DEFAULT: { stroke: '#94a3b8', label: '#64748b', bg: '#f1f5f9' },
}

export function getRelColor(type) {
  const key = (type || '').toUpperCase().replace(/ /g, '_')
  return REL_COLORS[key] || REL_COLORS.DEFAULT
}
