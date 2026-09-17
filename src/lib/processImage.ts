// Shared types for the compress/convert pipeline, plus the zip bundler.
// The pixel pipeline itself (decode/resize/encode) lives in pipelineCore.ts
// and only ever runs inside a Web Worker — see imageWorkerPool.ts for the
// main-thread entry point that dispatches to it.
import JSZip from 'jszip'

export type ConvertFormat = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif'

export interface CompressOptions {
  enabled: boolean
  quality: number
  maxDimension: number | null
  // When set, quality/maxDimension above are treated as a starting point:
  // whichever of the two `solveFor` does NOT name is solved per-image via
  // binary search so the compressed output lands close to this size.
  targetSizeKB: number | null
  solveFor: 'resolution' | 'quality'
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

// Picks WebP for images with transparency (JPEG has no alpha channel and
// would flatten transparent pixels to black), JPEG otherwise.
export function autoCompressFormat(hasAlpha: boolean): 'image/jpeg' | 'image/webp' {
  return hasAlpha ? 'image/webp' : 'image/jpeg'
}

// Bundles multiple processed results into a single downloadable zip.
export async function buildZip(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const zip = new JSZip()
  for (const { name, blob } of files) {
    zip.file(name, blob)
  }
  return zip.generateAsync({ type: 'blob' })
}
