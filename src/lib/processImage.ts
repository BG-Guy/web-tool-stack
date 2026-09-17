// Runs the batch pipeline on a single image: compress, then convert, in
// that fixed order, using only whichever steps are enabled. Each stage
// re-decodes its predecessor's output blob, so chaining both stages
// produces exactly what running them one after another by hand would —
// including the compounding quality loss that implies.
import JSZip from 'jszip'
import {
  canvasHasAlpha,
  canvasToBlob,
  drawImageToCanvas,
  loadImageFromFile,
} from './imageProcessing'

export type ConvertFormat = 'image/png' | 'image/jpeg' | 'image/webp'

export interface CompressOptions {
  enabled: boolean
  quality: number
  maxDimension: number | null
}

export interface ConvertOptions {
  enabled: boolean
  format: ConvertFormat
  quality: number
}

export interface PipelineOptions {
  compress: CompressOptions
  convert: ConvertOptions
}

function formatSupportsQuality(mimeType: string) {
  return mimeType === 'image/jpeg' || mimeType === 'image/webp'
}

// Picks WebP for images with transparency (JPEG has no alpha channel and
// would flatten transparent pixels to black), JPEG otherwise.
function autoCompressFormat(hasAlpha: boolean): 'image/jpeg' | 'image/webp' {
  return hasAlpha ? 'image/webp' : 'image/jpeg'
}

// Processes one file through the enabled pipeline stages and returns the
// final blob plus the mime type it was encoded as. Throws if neither
// stage is enabled, or if the file can't be decoded as an image.
export async function processImage(
  file: File,
  options: PipelineOptions,
): Promise<{ blob: Blob; mimeType: string }> {
  if (!options.compress.enabled && !options.convert.enabled) {
    throw new Error('No processing operation selected.')
  }

  let image = await loadImageFromFile(file)
  let blob: Blob | null = null
  let mimeType = file.type

  if (options.compress.enabled) {
    const hasAlpha = canvasHasAlpha(drawImageToCanvas(image))
    const compressMime = autoCompressFormat(hasAlpha)
    const backgroundColor = compressMime === 'image/jpeg' ? '#ffffff' : undefined
    const canvas = drawImageToCanvas(image, options.compress.maxDimension ?? undefined, backgroundColor)
    blob = await canvasToBlob(canvas, compressMime, options.compress.quality)
    mimeType = compressMime
    if (options.convert.enabled) {
      image = await loadImageFromFile(blob) // feed the compressed result into the convert stage
    }
  }

  if (options.convert.enabled) {
    const hasAlpha = canvasHasAlpha(drawImageToCanvas(image))
    const targetMime = options.convert.format
    const backgroundColor = targetMime === 'image/jpeg' && hasAlpha ? '#ffffff' : undefined
    const canvas = drawImageToCanvas(image, undefined, backgroundColor)
    const quality = formatSupportsQuality(targetMime) ? options.convert.quality : undefined
    blob = await canvasToBlob(canvas, targetMime, quality)
    mimeType = targetMime
  }

  if (!blob) throw new Error('Processing produced no output.')
  return { blob, mimeType }
}

// Bundles multiple processed results into a single downloadable zip.
export async function buildZip(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const zip = new JSZip()
  for (const { name, blob } of files) {
    zip.file(name, blob)
  }
  return zip.generateAsync({ type: 'blob' })
}
