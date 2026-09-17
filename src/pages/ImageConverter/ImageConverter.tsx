// Convert an image between PNG, JPEG, and WebP by re-drawing it onto a
// canvas and re-encoding it in the target format.
import { useState } from 'react'
import { DropZone } from '../../components/DropZone/DropZone'
import {
  canvasToBlob,
  downloadBlob,
  drawImageToCanvas,
  loadImageFromFile,
  replaceExtension,
} from '../../lib/imageProcessing'
import './ImageConverter.css'

const FORMATS = [
  { label: 'PNG', mimeType: 'image/png' },
  { label: 'JPEG', mimeType: 'image/jpeg' },
  { label: 'WebP', mimeType: 'image/webp' },
]

export function ImageConverter() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [targetFormat, setTargetFormat] = useState(FORMATS[2].mimeType)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Loads the picked file once, then re-encodes it in the chosen format.
  async function handleFile(file: File) {
    setError(null)
    try {
      const img = await loadImageFromFile(file)
      const drawn = drawImageToCanvas(img)
      setFileName(file.name)
      setCanvas(drawn)
      setPreviewUrl(URL.createObjectURL(file))
      await convert(drawn, targetFormat)
    } catch {
      setError('Could not load that image. Try a different file.')
    }
  }

  // Re-encodes the loaded canvas into the given mime type.
  async function convert(targetCanvas: HTMLCanvasElement, mimeType: string) {
    setIsProcessing(true)
    try {
      const blob = await canvasToBlob(targetCanvas, mimeType)
      setResultBlob(blob)
    } catch {
      setError('This browser cannot encode that format.')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleFormatChange(mimeType: string) {
    setTargetFormat(mimeType)
    if (canvas) void convert(canvas, mimeType)
  }

  function handleDownload() {
    if (resultBlob && fileName) {
      downloadBlob(resultBlob, replaceExtension(fileName, targetFormat))
    }
  }

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
