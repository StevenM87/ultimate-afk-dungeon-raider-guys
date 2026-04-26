import { useMemo, useState } from 'react'
import AdminDashboard from './components/AdminDashboard'
import AdminLoginForm from './components/AdminLoginForm'

const SESSION_KEY = 'adminPortalSession'

function getStoredSession() {
  try {
    const savedSession = sessionStorage.getItem(SESSION_KEY)
    return savedSession ? JSON.parse(savedSession) : null
  } catch {
    return null
  }
}

function AdminApp() {
  const [adminSession, setAdminSession] = useState(getStoredSession)

  const isAuthenticated = useMemo(
    () => Boolean(adminSession?.role === 'admin'),
    [adminSession],
  )

  const handleLoginSuccess = (adminUser) => {
    const session = { ...adminUser, loggedInAt: Date.now() }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setAdminSession(session)
  }

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setAdminSession(null)
  }

  return (
    <main className="admin-app-shell">
      {isAuthenticated ? (
        <AdminDashboard adminUser={adminSession} onLogout={handleLogout} />
      ) : (
        <AdminLoginForm onLoginSuccess={handleLoginSuccess} />
      )}
    </main>
  )
}

export default AdminApp
