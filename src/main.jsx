/**
 * main.jsx — Application Entry Point
 *
 * Mounts the React root into the DOM and wraps the app in StrictMode
 * for development-time warnings and double-render checks.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
