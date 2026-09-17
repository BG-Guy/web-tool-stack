// Page shell shared by every route: header with nav, and a content slot.
import { Link, Outlet } from 'react-router-dom'
import './Layout.css'

export function Layout() {
  return (
    <div className="layout">
      <header className="layout__header">
        <Link to="/" className="layout__brand">
          Web Tool Stack
        </Link>
        <nav className="layout__nav">
          <Link to="/remove-text">Remove Text</Link>
        </nav>
      </header>
      <main className="layout__content">
        <Outlet />
      </main>
      <footer className="layout__footer">
        <p>All processing happens locally in your browser — files are never uploaded.</p>
      </footer>
    </div>
  )
}
