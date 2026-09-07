export default function AuthShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="modal-content bg-white rounded-2xl shadow-lg border border-slate-200 w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold tracking-tight">
            P
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">PeopleGraph</p>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          {subtitle && <p className="text-slate-500 mt-2 text-sm">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
