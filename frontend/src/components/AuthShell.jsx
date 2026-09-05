export default function AuthShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="modal-content bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-sitemap text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          {subtitle && <p className="text-slate-500 mt-2 text-sm">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
