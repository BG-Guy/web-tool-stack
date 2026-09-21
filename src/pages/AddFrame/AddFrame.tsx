// Composite a photo into a frame graphic. The frame's own aspect ratio
// is detected automatically (usually 16:9 for a widescreen frame) and
// the photo is center-cropped to match before the frame is drawn on top
// — see lib/frame.ts for the actual compositing.
import { useEffect, useRef, useState } from 'react'
import { DropZone } from '../../components/DropZone/DropZone'
import {
  canvasToBlob,
  downloadBlob,
  formatBytes,
  loadImageFromFile,
  replaceExtension,
} from '../../lib/imageProcessing'
import { compositeFrame } from '../../lib/frame'
import './AddFrame.css'

type Format = 'image/jpeg' | 'image/webp'

// Reduces e.g. 1920x1080 to a readable "16:9" for the detected-ratio hint.
function simplifyRatio(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(Math.round(w), Math.round(h)) || 1
  return `${Math.round(w / divisor)}:${Math.round(h / divisor)}`
}

export function AddFrame() {
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null)
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [frame, setFrame] = useState<HTMLImageElement | null>(null)
  const [format, setFormat] = useState<Format>('image/jpeg')
  const [quality, setQuality] = useState(0.9)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resultUrlRef = useRef<string | null>(null)

  async function handlePhoto(file: File) {
    setError(null)
    try {
      setPhoto(await loadImageFromFile(file))
      setPhotoName(file.name)
    } catch {
      setError('Could not load that photo. Try a different file.')
    }
  }

  async function handleFrame(file: File) {
    setError(null)
    try {
      setFrame(await loadImageFromFile(file))
    } catch {
      setError('Could not load that frame. Try a different file.')
    }
  }

  // Re-composites whenever either image or the output settings change.
  useEffect(() => {
    if (!photo || !frame) return
    let cancelled = false
    setIsProcessing(true)
    setError(null)
    ;(async () => {
      try {
        const canvas = compositeFrame(photo, frame)
        const blob = await canvasToBlob(canvas, format, quality)
        if (cancelled) return
        if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
        const url = URL.createObjectURL(blob)
        resultUrlRef.current = url
        setResultBlob(blob)
        setResultUrl(url)
      } catch {
        if (!cancelled) setError('Could not combine that photo and frame.')
      } finally {
        if (!cancelled) setIsProcessing(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [photo, frame, format, quality])

  function handleDownload() {
    if (resultBlob) downloadBlob(resultBlob, replaceExtension(`framed-${photoName ?? 'photo'}`, format))
  }

  const frameRatio = frame ? simplifyRatio(frame.naturalWidth, frame.naturalHeight) : null

  return (
    <div className="add-frame">
      <h1>Add a Frame</h1>
      <p className="add-frame__intro">
        Upload your photo and a frame graphic (a PNG with a transparent window works best) — your
        photo is automatically cropped to match the frame's shape, centered.
      </p>

      <div className="add-frame__inputs">
        <div className="add-frame__input">
          <h2 className="add-frame__input-title">1. Your photo</h2>
          <DropZone accept="image/*" onFile={handlePhoto} label="Drop your photo here, or click to browse" />
        </div>
        <div className="add-frame__input">
          <h2 className="add-frame__input-title">2. Frame</h2>
          <DropZone accept="image/*" onFile={handleFrame} label="Drop a frame image here, or click to browse" />
          {frame && frameRatio && (
            <p className="add-frame__hint">
              This frame is {frameRatio} ({frame.naturalWidth}×{frame.naturalHeight}px) — your photo
              will be cropped to fit.
            </p>
          )}
        </div>
      </div>

      {error && <p className="add-frame__error">{error}</p>}

      {photo && frame && (
        <div className="add-frame__result">
          {resultUrl && <img src={resultUrl} alt="Framed preview" className="add-frame__preview" />}

          <label className="field">
            Output format
            <select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
              <option value="image/jpeg">JPEG (smaller, most compatible)</option>
              <option value="image/webp">WebP (smaller still)</option>
            </select>
          </label>

          <label className="field">
            Quality: {Math.round(quality * 100)}%
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            />
          </label>

          {resultBlob && <p className="add-frame__size">File size: {formatBytes(resultBlob.size)}</p>}

          <button
            type="button"
            className="btn btn--primary"
            disabled={!resultBlob || isProcessing}
            onClick={handleDownload}
          >
            {isProcessing ? 'Processing…' : 'Download framed image'}
          </button>
        </div>
      )}
    </div>
  )
}
