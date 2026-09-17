// Binary-search solvers that answer "what resolution/quality gets this
// image close to a target file size?" by actually trial-encoding the
// image a handful of times — there's no formula for this since it
// depends entirely on image content, only real encodes give an honest
// answer. Used both for the live estimate in the UI and for tuning each
// image individually during real batch processing.
import { canvasToBlob, drawImageToCanvas } from './imageProcessing'

const MIN_DIMENSION = 64
const MIN_QUALITY = 0.05

function encodeAt(image: HTMLImageElement, maxDimension: number | undefined, quality: number, mimeType: string) {
  const backgroundColor = mimeType === 'image/jpeg' ? '#ffffff' : undefined
  const canvas = drawImageToCanvas(image, maxDimension, backgroundColor)
  return canvasToBlob(canvas, mimeType, quality)
}

interface ResolutionSolveInput {
  image: HTMLImageElement
  mimeType: string
  quality: number
  targetBytes: number
  iterations?: number
}

// Holds quality fixed and binary-searches the max dimension that gets
// closest to (without exceeding, where possible) the target size.
export async function solveResolutionForTargetSize({
  image,
  mimeType,
  quality,
  targetBytes,
  iterations = 9,
}: ResolutionSolveInput): Promise<{ maxDimension: number; blob: Blob }> {
  const nativeMax = Math.max(image.naturalWidth, image.naturalHeight)

  // If full resolution already meets the target, there's nothing to shrink.
  const fullBlob = await encodeAt(image, undefined, quality, mimeType)
  if (fullBlob.size <= targetBytes) {
    return { maxDimension: nativeMax, blob: fullBlob }
  }

  let low = MIN_DIMENSION
  let high = nativeMax
  let best = { maxDimension: low, blob: await encodeAt(image, low, quality, mimeType) }

  for (let i = 0; i < iterations; i++) {
    const mid = Math.round((low + high) / 2)
    if (mid === low || mid === high) break
    const blob = await encodeAt(image, mid, quality, mimeType)
    if (blob.size > targetBytes) {
      high = mid
    } else {
      low = mid
      best = { maxDimension: mid, blob }
    }
  }

  return best
}

interface QualitySolveInput {
  image: HTMLImageElement
  mimeType: string
  maxDimension: number | undefined
  targetBytes: number
  iterations?: number
}

// Holds resolution fixed and binary-searches the quality that gets
// closest to (without exceeding, where possible) the target size.
export async function solveQualityForTargetSize({
  image,
  mimeType,
  maxDimension,
  targetBytes,
  iterations = 9,
}: QualitySolveInput): Promise<{ quality: number; blob: Blob }> {
  // If even full quality meets the target, no need to search further down.
  const fullBlob = await encodeAt(image, maxDimension, 1, mimeType)
  if (fullBlob.size <= targetBytes) {
    return { quality: 1, blob: fullBlob }
  }

  let low = MIN_QUALITY
  let high = 1
  let best = { quality: low, blob: await encodeAt(image, maxDimension, low, mimeType) }

  for (let i = 0; i < iterations; i++) {
    const mid = (low + high) / 2
    const blob = await encodeAt(image, maxDimension, mid, mimeType)
    if (blob.size > targetBytes) {
      high = mid
    } else {
      low = mid
      best = { quality: mid, blob }
    }
  }

  return best
}
