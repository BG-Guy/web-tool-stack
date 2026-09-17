// Shared browser-only helpers for loading images onto a canvas and
// exporting the result. Every image tool (compressor, converter, ...)
// builds on these instead of re-implementing canvas plumbing.

// Reads a File into an <img> element so it can be drawn onto a canvas.
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image file.'))
    }
    img.src = url
  })
}

// Draws an image at full resolution onto an off-screen canvas so it can
// be re-encoded (compressed or converted to another format).
export function drawImageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context is not available.')
  ctx.drawImage(img, 0, 0)
  return canvas
}

// Promise wrapper around canvas.toBlob, which only takes a callback.
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed.'))),
      type,
      quality,
    )
  })
}

// Triggers a browser download for a generated blob.
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Formats a byte count as a human-readable string (e.g. "482 KB").
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / 1024 ** exponent
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`
}

// Swaps a file's extension for the one matching its new mime type.
export function replaceExtension(filename: string, mimeType: string): string {
  const ext = mimeType.split('/')[1] ?? 'png'
  const base = filename.replace(/\.[^./]+$/, '')
  return `${base}.${ext === 'jpeg' ? 'jpg' : ext}`
}
