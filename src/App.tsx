// Top-level route table. The image workflow wizard is the whole app's
// home page; Remove Text stays as a separate manual tool since it needs
// per-image interactive masking that doesn't fit an automatic batch step.
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { ImageWorkflow } from './pages/ImageWorkflow/ImageWorkflow'
import { RemoveText } from './pages/RemoveText/RemoveText'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ImageWorkflow />} />
        <Route path="remove-text" element={<RemoveText />} />
      </Route>
    </Routes>
  )
}

export default App
