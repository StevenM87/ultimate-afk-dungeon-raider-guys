import { useState } from 'react'
import { authenticateAdmin } from '../services/adminApi'
import { useForm } from 'react-hook-form'

function AdminLoginForm({ onLoginSuccess }) {
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm()

  const onSubmit = async (data) => {
    setError('')
    setIsSubmitting(true)

    try {
      const admin = await authenticateAdmin(
        data.username.trim(),
        data.password
      )
      onLoginSuccess(admin)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="admin-card admin-login-card">
      <h1>Admin Portal</h1>
      <p className="admin-subtle-text">
        Sign in with an account that has the <code>admin</code> role.
      </p>

      <form className="admin-form" onSubmit={handleSubmit(onSubmit)}>
        <label htmlFor="admin-username">Username</label>
        <input
          id="admin-username"
          type="text"
          autoComplete="username"
          {...register('username', { required: 'Username is required' })}
        />
        {errors.username && (
          <p className="admin-error">{errors.username.message}</p>
        )}

        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          {...register('password', { required: 'Password is required' })}
        />
        {errors.password && (
          <p className="admin-error">{errors.password.message}</p>
        )}

        {error && <p className="admin-error">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </section>
  )
}

export default AdminLoginForm