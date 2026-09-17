// Worker-safe canvas plumbing: decode a File into raw pixels, resize, and
// flatten transparency onto a background — all via OffscreenCanvas and
// createImageBitmap, which (unlike <img>/HTMLCanvasElement) work inside a
// Web Worker. This is what lets the whole compress/convert pipeline run
// off the main thread.
import { resizeImageData } from './wasmCodecs'

function newCanvas(width: number, height: number): OffscreenCanvas {
  return new OffscreenCanvas(width, height)
}

function get2dContext(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2D context is not available.')
  return ctx
}

// Decodes a File/Blob to raw pixels at its native resolution.
export async function decodeFile(source: File | Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(source)
  const canvas = newCanvas(bitmap.width, bitmap.height)
  const ctx = get2dContext(canvas)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

// Checks whether an image has any non-opaque pixels — used to avoid
// exporting a transparent image as JPEG, which has no alpha channel and
// would silently flatten transparent areas to black.
export function hasAlpha(imageData: ImageData): boolean {
  const { data } = imageData
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true
  }
  return false
}

// Downscales to fit maxDimension if the image exceeds it — resizing is
// usually the single biggest lever for reducing file size. Returns the
// input unchanged if it's already within bounds.
export async function resizeToMaxDimension(imageData: ImageData, maxDimension: number): Promise<ImageData> {
  const { width, height } = imageData
  const longest = Math.max(width, height)
  if (longest <= maxDimension) return imageData
  const scale = maxDimension / longest
  return resizeImageData(imageData, Math.round(width * scale), Math.round(height * scale))
}

// Composites the image over a solid background — needed before exporting
// to a format with no alpha channel (JPEG), since it would otherwise
// flatten transparent pixels to black.
export async function flattenOntoBackground(imageData: ImageData, backgroundColor: string): Promise<ImageData> {
  const { width, height } = imageData
  const canvas = newCanvas(width, height)
  const ctx = get2dContext(canvas)
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, width, height)
  const bitmap = await createImageBitmap(imageData)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return ctx.getImageData(0, 0, width, height)
}
