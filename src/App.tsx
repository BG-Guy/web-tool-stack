// Top-level route table. Add a new <Route> here whenever a new tool
// page is created, and a matching ToolCard on the Home page.
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { Home } from './pages/Home/Home'
import { ImageCompressor } from './pages/ImageCompressor/ImageCompressor'
import { ImageConverter } from './pages/ImageConverter/ImageConverter'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="compress-image" element={<ImageCompressor />} />
        <Route path="convert-image" element={<ImageConverter />} />
      </Route>
    </Routes>
  )
}

export default App
