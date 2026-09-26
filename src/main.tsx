// App entry point: mounts the router-driven App inside global styles.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// HashRouter (not BrowserRouter) because this deploys to GitHub Pages,
// which has no server-side rewrite rule for a single-page app — a direct
// load or refresh of e.g. /remove-text would 404. Hash-based routes
// (/#/remove-text) always resolve to index.html since the fragment is
// never sent to the server.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
