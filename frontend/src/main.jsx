import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { loadClinicSettings } from './services/clinic'

// Times and prices depend on the clinic's zone and currency, so load them before the first render.
await loadClinicSettings()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
