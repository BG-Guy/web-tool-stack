// Convert an image between PNG, JPEG, and WebP by re-drawing it onto a
// canvas and re-encoding it in the target format.
import { useState } from 'react'
import { DropZone } from '../../components/DropZone/DropZone'
import {
  canvasHasAlpha,
  canvasToBlob,
  downloadBlob,
  drawImageToCanvas,
  formatBytes,
  loadImageFromFile,
  replaceExtension,
} from '../../lib/imageProcessing'
import './ImageConverter.css'

const FORMATS = [
  { label: 'PNG', mimeType: 'image/png' },
  { label: 'JPEG', mimeType: 'image/jpeg' },
  { label: 'WebP', mimeType: 'image/webp' },
]

// PNG is lossless and ignores the quality parameter — only show the
// slider for the two formats that actually use it.
function supportsQuality(mimeType: string) {
  return mimeType === 'image/jpeg' || mimeType === 'image/webp'
}

export function ImageConverter() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [originalSize, setOriginalSize] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [hasAlpha, setHasAlpha] = useState(false)
  const [targetFormat, setTargetFormat] = useState(FORMATS[2].mimeType)
  const [quality, setQuality] = useState(0.85)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Loads the picked file once, then re-encodes it whenever a setting changes.
  async function handleFile(file: File) {
    setError(null)
    try {
      const img = await loadImageFromFile(file)
      const alpha = canvasHasAlpha(drawImageToCanvas(img))
      setFileName(file.name)
      setOriginalSize(file.size)
      setSourceImage(img)
      setHasAlpha(alpha)
      setPreviewUrl(URL.createObjectURL(file))
      await convert(img, targetFormat, quality)
    } catch {
      setError('Could not load that image. Try a different file.')
    }
  }

  // Redraws the source and re-encodes it into the given mime type. JPEG has no
  // alpha channel, so we fill white behind the image first — otherwise browsers
  // flatten transparent pixels to black instead of leaving them looking blank.
  async function convert(img: HTMLImageElement, mimeType: string, targetQuality: number) {
    setIsProcessing(true)
    try {
      const backgroundColor = mimeType === 'image/jpeg' ? '#ffffff' : undefined
      const canvas = drawImageToCanvas(img, undefined, backgroundColor)
      const blob = await canvasToBlob(
        canvas,
        mimeType,
        supportsQuality(mimeType) ? targetQuality : undefined,
      )
      setResultBlob(blob)
    } catch {
      setError('This browser cannot encode that format.')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleFormatChange(mimeType: string) {
    setTargetFormat(mimeType)
    if (sourceImage) void convert(sourceImage, mimeType, quality)
  }

  function handleQualityChange(value: number) {
    setQuality(value)
    if (sourceImage) void convert(sourceImage, targetFormat, value)
  }

  function handleDownload() {
    if (resultBlob && fileName) {
      downloadBlob(resultBlob, replaceExtension(fileName, targetFormat))
    }
  }

  const sizeDelta =
    resultBlob && originalSize > 0
      ? Math.round((1 - resultBlob.size / originalSize) * 100)
      : null

  return (
    <div className="converter">
      <h1>Convert Image</h1>
      <p className="converter__intro">
        Drop an image, pick a target format, and download the result.
      </p>

      <DropZone accept="image/*" onFile={handleFile} />

      {error && <p className="converter__error">{error}</p>}

      {previewUrl && (
        <div className="converter__result">
          <img className="converter__preview" src={previewUrl} alt="Selected preview" />

          <div className="converter__formats">
            {FORMATS.map((format) => (
              <button
                key={format.mimeType}
                type="button"
                className={`converter__format-btn${
                  targetFormat === format.mimeType ? ' converter__format-btn--active' : ''
                }`}
                onClick={() => handleFormatChange(format.mimeType)}
              >
                {format.label}
              </button>
            ))}
          </div>

          {hasAlpha && targetFormat === 'image/jpeg' && (
            <p className="converter__warning">
              This image has transparency — JPEG can't keep it, so the background will be
              filled white.
            </p>
          )}

          {supportsQuality(targetFormat) && (
            <label className="converter__field">
              Quality: {Math.round(quality * 100)}%
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => handleQualityChange(Number(e.target.value))}
              />
            </label>
          )}

          <div className="converter__stats">
            <span>Original: {formatBytes(originalSize)}</span>
            {resultBlob && <span>Converted: {formatBytes(resultBlob.size)}</span>}
            {sizeDelta !== null && (
              <span className={sizeDelta >= 0 ? 'converter__shrunk' : 'converter__grew'}>
                {sizeDelta >= 0 ? '-' : '+'}
                {Math.abs(sizeDelta)}%
              </span>
            )}
          </div>

          <button
            type="button"
            className="converter__download"
            disabled={!resultBlob || isProcessing}
            onClick={handleDownload}
          >
            {isProcessing ? 'Processing…' : 'Download converted image'}
          </button>
        </div>
      )}
    </div>
  )
}
