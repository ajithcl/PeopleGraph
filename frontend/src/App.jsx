import { useEffect, useState } from 'react'
import {
  api,
  apiBase,
  clearSession,
  getInviteTokenFromUrl,
  loadSession,
  saveSession,
} from './api'
import BootstrapForm from './components/BootstrapForm'
import ClaimOnboarding from './components/ClaimOnboarding'
import KinshipApp from './components/KinshipApp'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'

export default function App() {
  const [session, setSession] = useState(null)
  const [authView, setAuthView] = useState(() => (getInviteTokenFromUrl() ? 'register' : 'login'))
  const [booting, setBooting] = useState(true)
  const [canBootstrap, setCanBootstrap] = useState(false)

  useEffect(() => {
    async function boot() {
      const saved = loadSession()
      if (saved?.token) {
        api.setAuth(saved.token, saved.spaceId)
        try {
          const me = await api.me(saved.spaceId)
          if (me.success) {
            const spaces = me.data.spaces || []
            const spaceId =
              saved.spaceId && spaces.some((s) => s.id === saved.spaceId) ? saved.spaceId : spaces[0]?.id
            const meForSpace = spaceId && spaceId !== saved.spaceId ? await api.me(spaceId) : me
            const payload = meForSpace.data || me.data
            const role = spaces.find((s) => s.id === spaceId)?.role || saved.role
            const next = {
              token: saved.token,
              user: payload.user,
              spaces,
              spaceId,
              role,
              personId: payload.personId || null,
              personName: payload.personName || null,
              needsClaim: !!payload.needsClaim,
            }
            saveSession(next)
            setSession(next)
            setBooting(false)
            return
          }
        } catch {
          clearSession()
        }
      }

      try {
        const r = await fetch(`${apiBase()}/api/auth/bootstrap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: '', password: '' }),
        })
        const data = await r.json()
        setCanBootstrap(r.status === 400 || (data.error || '').includes('required'))
        if (r.status === 403) setCanBootstrap(false)
      } catch {
        setCanBootstrap(true)
      }

      if (getInviteTokenFromUrl()) setAuthView('register')
      setBooting(false)
    }
    boot()
  }, [])

  const handleAuthSuccess = (next) => {
    saveSession(next)
    api.setAuth(next.token, next.spaceId)
    setSession(next)
  }

  const handleClaimed = (next) => {
    saveSession(next)
    api.setAuth(next.token, next.spaceId)
    setSession(next)
  }

  const handleLogout = () => {
    clearSession()
    api.setAuth(null, null)
    setSession(null)
    setAuthView('login')
  }

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white" />
      </div>
    )
  }

  if (!session) {
    if (authView === 'register') {
      return (
        <RegisterForm
          inviteToken={getInviteTokenFromUrl()}
          onSuccess={handleAuthSuccess}
          onSwitchLogin={() => setAuthView('login')}
        />
      )
    }
    if (authView === 'bootstrap') {
      return <BootstrapForm onSuccess={handleAuthSuccess} onSwitchLogin={() => setAuthView('login')} />
    }
    return (
      <LoginForm
        onSuccess={handleAuthSuccess}
        onSwitchRegister={() => setAuthView('register')}
        onSwitchBootstrap={() => setAuthView('bootstrap')}
        canBootstrap={canBootstrap}
      />
    )
  }

  if (session.needsClaim || !session.personId) {
    return <ClaimOnboarding session={session} onClaimed={handleClaimed} onLogout={handleLogout} />
  }

  return (
    <KinshipApp
      session={session}
      onLogout={handleLogout}
      onSessionUpdate={(next) => {
        saveSession(next)
        setSession(next)
      }}
    />
  )
}
