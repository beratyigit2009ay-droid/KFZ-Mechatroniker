import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.jsx'
import { pageKeyFromPath } from './pages.js'
import './styles.css'

const container = document.getElementById('root')
const prerendered = container.dataset.page
const page = prerendered || pageKeyFromPath(window.location.pathname)
const app = (
  <StrictMode>
    <App page={page} />
  </StrictMode>
)

if (prerendered) hydrateRoot(container, app)
else createRoot(container).render(app)
