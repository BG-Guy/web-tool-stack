// Erase text (or anything else) from an image by painting over it and
// letting a local pixel-diffusion fill blend the surroundings inward.
// No AI model and nothing leaves the browser — see inpaintMaskedRegion
// for how the fill itself works.
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { DropZone } from '../../components/DropZone/DropZone'
import {
  canvasToBlob,
  downloadBlob,
  loadImageFromFile,
  replaceExtension,
} from '../../lib/imageProcessing'
import { inpaintMaskedRegion } from '../../lib/inpaint'
import './RemoveText.css'

const BRUSH_COLOR = 'rgba(236, 72, 153, 0.55)'

export function RemoveText() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [brushSize, setBrushSize] = useState(24)
  const [hasMask, setHasMask] = useState(false)
  const [hasEdits, setHasEdits] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  // (Re)draws the loaded image onto the base canvas and clears any brush
  // marks — used on first load and by the "Reset image" button.
  function drawBase(img: HTMLImageElement) {
    const base = baseCanvasRef.current
    const mask = maskCanvasRef.current
    if (!base || !mask) return
    base.width = img.naturalWidth
    base.height = img.naturalHeight
    mask.width = img.naturalWidth
    mask.height = img.naturalHeight
    base.getContext('2d')!.drawImage(img, 0, 0)
    mask.getContext('2d')!.clearRect(0, 0, mask.width, mask.height)
    setHasMask(false)
    setHasEdits(false)
  }

  useEffect(() => {
    if (sourceImage) drawBase(sourceImage)
    // drawBase is stable enough for this purpose; only re-run when a new image loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceImage])

  async function handleFile(file: File) {
    setError(null)
    try {
      const img = await loadImageFromFile(file)
      setFileName(file.name)
      setSourceImage(img)
    } catch {
      setError('Could not load that image. Try a different file.')
    }
  }

  // Maps a pointer event's screen coordinates to the mask canvas's own
  // pixel space, since the canvas is displayed scaled down via CSS.
  function getPoint(e: PointerEvent<HTMLCanvasElement>) {
    const mask = maskCanvasRef.current
    if (!mask) return null
    const rect = mask.getBoundingClientRect()
    const scale = mask.width / rect.width
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale, scale }
  }

  function strokeTo(from: { x: number; y: number }, to: { x: number; y: number }, scale: number) {
    const ctx = maskCanvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = BRUSH_COLOR
    ctx.lineWidth = brushSize * scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    setHasMask(true)
  }

  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>) {
    const point = getPoint(e)
    if (!point) return
    maskCanvasRef.current?.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    lastPointRef.current = { x: point.x, y: point.y }
    strokeTo({ x: point.x, y: point.y }, { x: point.x, y: point.y }, point.scale)
  }

  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const point = getPoint(e)
    if (!point || !lastPointRef.current) return
    strokeTo(lastPointRef.current, { x: point.x, y: point.y }, point.scale)
    lastPointRef.current = { x: point.x, y: point.y }
  }

  function handlePointerUp() {
    isDrawingRef.current = false
    lastPointRef.current = null
  }

  function handleClearMask() {
    const mask = maskCanvasRef.current
    if (!mask) return
    mask.getContext('2d')!.clearRect(0, 0, mask.width, mask.height)
    setHasMask(false)
  }

  // Runs the fill, then clears the brush marks so the result is visible
  // and the user can immediately paint over anything else to remove.
  async function handleRemove() {
    const base = baseCanvasRef.current
    const mask = maskCanvasRef.current
    if (!base || !mask) return
    setIsProcessing(true)
    setError(null)
    try {
      await new Promise(requestAnimationFrame) // let "Removing…" paint before the solver blocks the main thread
      const applied = inpaintMaskedRegion(base, mask)
      if (applied) {
        handleClearMask()
        setHasEdits(true)
      }
    } catch {
      setError('Could not process that area — try a smaller selection.')
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleDownload() {
    const base = baseCanvasRef.current
    if (!base || !fileName) return
    const blob = await canvasToBlob(base, 'image/png')
    downloadBlob(blob, replaceExtension(fileName, 'image/png'))
  }

  return (
    <div className="remove-text">
      <h1>Remove Text From Image</h1>
      <p className="remove-text__intro">
        Paint over the text, then remove it. This blends nearby pixels inward — no AI model — so
        it works great on flat or gradient backgrounds (screenshots, graphics, memes) and looks
        softer on busy photo backgrounds.
      </p>

      <DropZone accept="image/*" onFile={handleFile} />

      {error && <p className="remove-text__error">{error}</p>}

      {sourceImage && (
        <div className="remove-text__editor">
          <div className="remove-text__canvas-wrap">
            <canvas ref={baseCanvasRef} className="remove-text__canvas" />
            <canvas
              ref={maskCanvasRef}
              className="remove-text__mask-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>

          <label className="remove-text__field">
            Brush size: {brushSize}px
            <input
              type="range"
              min={8}
              max={60}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
          </label>

          <div className="remove-text__actions">
            <button
              type="button"
              className="remove-text__secondary"
              onClick={() => sourceImage && drawBase(sourceImage)}
            >
              Reset image
            </button>
            <button
              type="button"
              className="remove-text__secondary"
              disabled={!hasMask}
              onClick={handleClearMask}
            >
              Clear brush marks
            </button>
            <button
              type="button"
              className="remove-text__primary"
              disabled={!hasMask || isProcessing}
              onClick={handleRemove}
            >
              {isProcessing ? 'Removing…' : 'Remove marked area'}
            </button>
          </div>

          <button
            type="button"
            className="remove-text__download"
            disabled={!hasEdits || isProcessing}
            onClick={handleDownload}
          >
            Download image
          </button>
        </div>
      )}
    </div>
  )
}
