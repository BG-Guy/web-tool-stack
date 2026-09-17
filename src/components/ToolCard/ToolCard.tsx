// A single tool entry shown on the home page grid, linking to its page.
import { Link } from 'react-router-dom'
import './ToolCard.css'

interface ToolCardProps {
  to: string
  title: string
  description: string
  icon: string
}

export function ToolCard({ to, title, description, icon }: ToolCardProps) {
  return (
    <Link to={to} className="tool-card">
      <span className="tool-card__icon" aria-hidden="true">
        {icon}
      </span>
      <h3 className="tool-card__title">{title}</h3>
      <p className="tool-card__description">{description}</p>
    </Link>
  )
}
