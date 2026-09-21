// Top-level route table. The image workflow wizard is the whole app's
// home page; the other tools stay separate since each needs its own
// interactive, single-purpose UI that doesn't fit the batch wizard.
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { ImageWorkflow } from './pages/ImageWorkflow/ImageWorkflow'
import { RemoveText } from './pages/RemoveText/RemoveText'
import { AddFrame } from './pages/AddFrame/AddFrame'
import { AspectRatioCrop } from './pages/AspectRatioCrop/AspectRatioCrop'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ImageWorkflow />} />
        <Route path="remove-text" element={<RemoveText />} />
        <Route path="add-frame" element={<AddFrame />} />
        <Route path="crop-aspect-ratio" element={<AspectRatioCrop />} />
      </Route>
    </Routes>
  )
}

export default App
