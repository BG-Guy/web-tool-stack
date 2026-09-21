// Crop an image to a chosen aspect ratio — a preset (square, widescreen,
// portrait, ...) or a custom ratio — using a centered "cover" crop.
import { useEffect, useRef, useState } from 'react'
import { DropZone } from '../../components/DropZone/DropZone'
import {
  canvasToBlob,
  cropToAspectRatio,
  downloadBlob,
  formatBytes,
  loadImageFromFile,
  replaceExtension,
} from '../../lib/imageProcessing'
import './AspectRatioCrop.css'

const PRESETS = [
  { label: 'Square (1:1)', w: 1, h: 1 },
  { label: 'Widescreen (16:9)', w: 16, h: 9 },
  { label: 'Vertical / Story (9:16)', w: 9, h: 16 },
  { label: 'Standard (4:3)', w: 4, h: 3 },
  { label: 'Classic photo (3:2)', w: 3, h: 2 },
  { label: 'Ultrawide (21:9)', w: 21, h: 9 },
]

const CUSTOM = 'custom'

type Format = 'image/png' | 'image/jpeg' | 'image/webp'

function supportsQuality(mimeType: string) {
  return mimeType === 'image/jpeg' || mimeType === 'image/webp'
}

export function AspectRatioCrop() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [originalSize, setOriginalSize] = useState(0)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [presetIndex, setPresetIndex] = useState<number | typeof CUSTOM>(1) // default: 16:9
  const [customW, setCustomW] = useState(1)
  const [customH, setCustomH] = useState(1)
  const [format, setFormat] = useState<Format>('image/jpeg')
  const [quality, setQuality] = useState(0.9)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resultUrlRef = useRef<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    try {
      const img = await loadImageFromFile(file)
      setSourceImage(img)
      setFileName(file.name)
      setOriginalSize(file.size)
    } catch {
      setError('Could not load that image. Try a different file.')
    }
  }

  const ratio = presetIndex === CUSTOM ? { w: customW, h: customH } : PRESETS[presetIndex]

  // Re-crops and re-encodes whenever the image, ratio, or output settings change.
  useEffect(() => {
    if (!sourceImage) return
    if (!ratio.w || !ratio.h) return
    let cancelled = false
    setIsProcessing(true)
    setError(null)
    ;(async () => {
      try {
        const canvas = cropToAspectRatio(sourceImage, ratio.w, ratio.h)
        const blob = await canvasToBlob(canvas, format, supportsQuality(format) ? quality : undefined)
        if (cancelled) return
        if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
        const url = URL.createObjectURL(blob)
        resultUrlRef.current = url
        setResultBlob(blob)
        setResultUrl(url)
      } catch {
        if (!cancelled) setError('Could not crop that image.')
      } finally {
        if (!cancelled) setIsProcessing(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceImage, ratio.w, ratio.h, format, quality])

  function handleDownload() {
    if (resultBlob && fileName) downloadBlob(resultBlob, replaceExtension(fileName, format))
  }

  return (
    <div className="aspect-crop">
      <h1>Crop to Aspect Ratio</h1>
      <p className="aspect-crop__intro">
        Drop an image, pick a ratio, and download a centered crop that matches it exactly.
      </p>

      <DropZone accept="image/*" onFile={handleFile} />

      {error && <p className="aspect-crop__error">{error}</p>}

      {sourceImage && (
        <div className="aspect-crop__result">
          {resultUrl && <img src={resultUrl} alt="Cropped preview" className="aspect-crop__preview" />}

          <label className="field">
            Aspect ratio
            <select
              value={presetIndex}
              onChange={(e) => setPresetIndex(e.target.value === CUSTOM ? CUSTOM : Number(e.target.value))}
            >
              {PRESETS.map((preset, index) => (
                <option key={preset.label} value={index}>
                  {preset.label}
                </option>
              ))}
              <option value={CUSTOM}>Custom…</option>
            </select>
          </label>

          {presetIndex === CUSTOM && (
            <div className="aspect-crop__custom">
              <label className="field">
                Width
                <input type="number" min={1} value={customW} onChange={(e) => setCustomW(Number(e.target.value))} />
              </label>
              <span className="aspect-crop__custom-sep">:</span>
              <label className="field">
                Height
                <input type="number" min={1} value={customH} onChange={(e) => setCustomH(Number(e.target.value))} />
              </label>
            </div>
          )}

          <label className="field">
            Output format
            <select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
              <option value="image/png">PNG (lossless)</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/webp">WebP</option>
            </select>
          </label>

          {supportsQuality(format) && (
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
          )}

          <div className="aspect-crop__stats">
            <span>Original: {formatBytes(originalSize)}</span>
            {resultBlob && <span>Cropped: {formatBytes(resultBlob.size)}</span>}
          </div>

          <button
            type="button"
            className="btn btn--primary"
            disabled={!resultBlob || isProcessing}
            onClick={handleDownload}
          >
            {isProcessing ? 'Processing…' : 'Download cropped image'}
          </button>
        </div>
      )}
    </div>
  )
}
