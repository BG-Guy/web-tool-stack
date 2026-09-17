// Landing page: a grid of available tools. Add a new ToolCard here
// whenever a new tool page is added to the app.
import { ToolCard } from '../../components/ToolCard/ToolCard'
import './Home.css'

export function Home() {
  return (
    <div className="home">
      <h1 className="home__title">Free, private image tools</h1>
      <p className="home__subtitle">
        Compress and convert images entirely in your browser. Nothing leaves your device.
      </p>
      <div className="home__grid">
        <ToolCard
          to="/compress-image"
          icon="🗜️"
          title="Compress Image"
          description="Shrink JPG, PNG, and WebP files by adjusting quality."
        />
        <ToolCard
          to="/convert-image"
          icon="🔄"
          title="Convert Image"
          description="Convert between JPG, PNG, and WebP formats."
        />
      </div>
    </div>
  )
}
