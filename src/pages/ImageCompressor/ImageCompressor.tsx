// Compress an image by re-encoding it at a chosen quality level, with
// an optional resize step. Everything runs on an in-memory canvas;
// nothing is uploaded anywhere.
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
import './ImageCompressor.css'

type Format = 'auto' | 'image/jpeg' | 'image/webp'

// Resolves "auto" to WebP for images with transparency (JPEG has no
// alpha channel and would flatten transparent areas to black),
// otherwise JPEG, which compresses slightly better for opaque photos.
function resolveFormat(format: Format, hasAlpha: boolean): 'image/jpeg' | 'image/webp' {
  if (format !== 'auto') return format
  return hasAlpha ? 'image/webp' : 'image/jpeg'
}

export function ImageCompressor() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [originalSize, setOriginalSize] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [hasAlpha, setHasAlpha] = useState(false)
  const [quality, setQuality] = useState(0.7)
  const [format, setFormat] = useState<Format>('auto')
  const [maxDimension, setMaxDimension] = useState<number | null>(null)
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
      await compress(img, quality, format, alpha, maxDimension)
    } catch {
      setError('Could not load that image. Try a different file.')
    }
  }

  // Redraws the source at the target size and re-encodes it at the target quality/format.
  async function compress(
    img: HTMLImageElement,
    targetQuality: number,
    targetFormat: Format,
    imgHasAlpha: boolean,
    targetMaxDimension: number | null,
  ) {
    setIsProcessing(true)
    try {
      const mimeType = resolveFormat(targetFormat, imgHasAlpha)
      const backgroundColor = mimeType === 'image/jpeg' ? '#ffffff' : undefined
      const canvas = drawImageToCanvas(img, targetMaxDimension ?? undefined, backgroundColor)
      const blob = await canvasToBlob(canvas, mimeType, targetQuality)
      setResultBlob(blob)
    } catch {
      setError('Compression failed for this image.')
    } finally {
      setIsProcessing(false)
    }
  }

  function reprocess(overrides: {
    quality?: number
    format?: Format
    maxDimension?: number | null
  }) {
    const nextQuality = overrides.quality ?? quality
    const nextFormat = overrides.format ?? format
    const nextMaxDimension =
      overrides.maxDimension !== undefined ? overrides.maxDimension : maxDimension
    setQuality(nextQuality)
    setFormat(nextFormat)
    setMaxDimension(nextMaxDimension)
    if (sourceImage) void compress(sourceImage, nextQuality, nextFormat, hasAlpha, nextMaxDimension)
  }

  function handleDownload() {
    if (resultBlob && fileName) {
      downloadBlob(resultBlob, replaceExtension(fileName, resolveFormat(format, hasAlpha)))
    }
  }

  const savings =
    resultBlob && originalSize > 0
      ? Math.round((1 - resultBlob.size / originalSize) * 100)
      : null

  return (
    <div className="compressor">
      <h1>Compress Image</h1>
      <p className="compressor__intro">
        Drop an image, adjust the settings, and download the smaller file.
      </p>

      <DropZone accept="image/*" onFile={handleFile} />

      {error && <p className="compressor__error">{error}</p>}

      {previewUrl && (
        <div className="compressor__result">
          <img className="compressor__preview" src={previewUrl} alt="Selected preview" />

          <label className="compressor__quality">
            Quality: {Math.round(quality * 100)}%
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={quality}
              onChange={(e) => reprocess({ quality: Number(e.target.value) })}
            />
          </label>

          <label className="compressor__field">
            Output format
            <select
              value={format}
              onChange={(e) => reprocess({ format: e.target.value as Format })}
            >
              <option value="auto">
                Auto ({resolveFormat('auto', hasAlpha) === 'image/webp' ? 'WebP' : 'JPEG'}
                {hasAlpha ? ' — keeps transparency' : ' — smaller for photos'})
              </option>
              <option value="image/jpeg">JPEG (no transparency)</option>
              <option value="image/webp">WebP (supports transparency)</option>
            </select>
          </label>

          <label className="compressor__field">
            Max dimension (px, optional)
            <input
              type="number"
              min={16}
              placeholder="No resize"
              value={maxDimension ?? ''}
              onChange={(e) =>
                reprocess({ maxDimension: e.target.value ? Number(e.target.value) : null })
              }
            />
          </label>

          <div className="compressor__stats">
            <span>Original: {formatBytes(originalSize)}</span>
            {resultBlob && <span>Compressed: {formatBytes(resultBlob.size)}</span>}
            {savings !== null && savings > 0 && (
              <span className="compressor__savings">-{savings}%</span>
            )}
          </div>

          <button
            type="button"
            className="compressor__download"
            disabled={!resultBlob || isProcessing}
            onClick={handleDownload}
          >
            {isProcessing ? 'Processing…' : 'Download compressed image'}
          </button>
        </div>
      )}
    </div>
  )
}
