import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AdminApp from './admin/AdminApp.jsx'
import './admin/styles/admin.css'

createRoot(document.getElementById('admin-root')).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)
