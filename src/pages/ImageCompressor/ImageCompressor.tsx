// Compress an image by re-encoding it at a chosen quality level.
// Everything runs on an in-memory canvas; nothing is uploaded anywhere.
import { useState } from 'react'
import { DropZone } from '../../components/DropZone/DropZone'
import {
  canvasToBlob,
  downloadBlob,
  drawImageToCanvas,
  formatBytes,
  loadImageFromFile,
  replaceExtension,
} from '../../lib/imageProcessing'
import './ImageCompressor.css'

const MIME_TYPE = 'image/jpeg'

export function ImageCompressor() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [originalSize, setOriginalSize] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [quality, setQuality] = useState(0.7)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Loads the picked file once, then re-encodes it whenever quality changes.
  async function handleFile(file: File) {
    setError(null)
    try {
      const img = await loadImageFromFile(file)
      const drawn = drawImageToCanvas(img)
      setFileName(file.name)
      setOriginalSize(file.size)
      setCanvas(drawn)
      setPreviewUrl(URL.createObjectURL(file))
      await compress(drawn, quality)
    } catch {
      setError('Could not load that image. Try a different file.')
    }
  }

  // Re-encodes the loaded canvas at the given quality and stores the result.
  async function compress(targetCanvas: HTMLCanvasElement, targetQuality: number) {
    setIsProcessing(true)
    try {
      const blob = await canvasToBlob(targetCanvas, MIME_TYPE, targetQuality)
      setResultBlob(blob)
    } catch {
      setError('Compression failed for this image.')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleQualityChange(value: number) {
    setQuality(value)
    if (canvas) void compress(canvas, value)
  }

  function handleDownload() {
    if (resultBlob && fileName) {
      downloadBlob(resultBlob, replaceExtension(fileName, MIME_TYPE))
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
        Drop an image, adjust the quality, and download the smaller file.
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
              onChange={(e) => handleQualityChange(Number(e.target.value))}
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
