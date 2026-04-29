import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import UserApp from './user/UserApp.jsx'
import './user/styles/user.css'

createRoot(document.getElementById('user-root')).render(
  <StrictMode>
    <UserApp />
  </StrictMode>,
)
