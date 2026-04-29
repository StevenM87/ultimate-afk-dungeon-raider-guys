import { useMemo, useState } from 'react'
import UserDashboard from './components/UserDashboard'
import UserLoginForm from './components/UserLoginForm'

const SESSION_KEY = 'userPortalSession'

function getStoredSession() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function UserApp() {
  const [userSession, setUserSession] = useState(getStoredSession)

  const isAuthenticated = useMemo(
    () => Boolean(userSession?.role === 'player'),
    [userSession],
  )

  const handleLoginSuccess = (user) => {
    const session = { ...user, loggedInAt: Date.now() }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUserSession(session)
  }

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setUserSession(null)
  }

  return (
    <main className="app-shell">
      {isAuthenticated ? (
        <UserDashboard user={userSession} onLogout={handleLogout} />
      ) : (
        <UserLoginForm onLoginSuccess={handleLoginSuccess} />
      )}
    </main>
  )
}

export default UserApp
