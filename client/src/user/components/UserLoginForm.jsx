import { useState } from 'react'
import { authenticateUser, createUser } from '../services/userApi'

function UserLoginForm({ onLoginSuccess }) {
  const [mode, setMode] = useState('login')        // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isLogin = mode === 'login'

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setSuccessMsg('')
    setUsername('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!isLogin && password.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isLogin) {
        // Sign in 
        const user = await authenticateUser(username.trim(), password)
        if (user.status === 'banned') {
          throw new Error('Your account has been banned.')
        }
        onLoginSuccess(user)
      } else {
        // Create account 
        await createUser(username.trim(), password)
        setSuccessMsg('Account created! You can now sign in.')
        switchMode('login')
      }
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-glow" />
      <section className="login-card">
        <div className="login-emblem">⚔</div>

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${isLogin ? 'login-tab--active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`login-tab ${!isLogin ? 'login-tab--active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Create Account
          </button>
        </div>

        <h1 className="login-title">
          {isLogin ? 'Welcome Back' : 'Join the Realm'}
        </h1>
        <p className="login-subtitle">
          {isLogin
            ? 'Sign in to your adventurer account'
            : 'Create your adventurer account'}
        </p>

        {successMsg ? (
          <p className="form-success">{successMsg}</p>
        ) : null}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label" htmlFor="user-username">
              Username
            </label>
            <input
              id="user-username"
              className="field-input"
              type="text"
              autoComplete="username"
              placeholder="your_hero_name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="user-password">
              Password
            </label>
            <input
              id="user-password"
              className="field-input"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Confirm password */}
          {!isLogin && (
            <div className="field-group">
              <label className="field-label" htmlFor="user-confirm">
                Confirm Password
              </label>
              <input
                id="user-confirm"
                className="field-input"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          {error ? <p className="form-error">{error}</p> : null}

          <button
            className="submit-btn"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-loading">
                {isLogin ? 'Entering realm' : 'Creating account'}
                <span className="dots" />
              </span>
            ) : isLogin ? (
              'Enter Realm'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="login-switch">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="link-btn"
            onClick={() => switchMode(isLogin ? 'register' : 'login')}
          >
            {isLogin ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </section>
    </div>
  )
}

export default UserLoginForm
