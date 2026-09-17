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

// Draws an image onto an off-screen canvas so it can be re-encoded
// (compressed or converted to another format). If maxDimension is set
// and the image exceeds it, the image is downscaled to fit — resizing
// is usually the single biggest lever for reducing file size. If
// backgroundColor is set, it's filled behind the image first — needed
// before exporting to a format with no alpha channel (JPEG), since
// browsers otherwise flatten transparent pixels to black.
export function drawImageToCanvas(
  img: HTMLImageElement,
  maxDimension?: number,
  backgroundColor?: string,
): HTMLCanvasElement {
  let { naturalWidth: width, naturalHeight: height } = img
  if (maxDimension && Math.max(width, height) > maxDimension) {
    const scale = maxDimension / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context is not available.')
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

// Checks whether a canvas has any non-opaque pixels. Used to avoid
// exporting a transparent image as JPEG, which has no alpha channel
// and would silently flatten transparent areas to black.
export function canvasHasAlpha(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true
  }
  return false
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
