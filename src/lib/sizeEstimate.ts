// Binary-search solvers that answer "what resolution/quality gets this
// image close to a target file size?" by actually trial-encoding the
// image (with the real WASM codec) a handful of times — there's no
// formula for this since it depends entirely on image content, only real
// encodes give an honest answer. Used both for the live estimate in the
// UI (via solveEstimateInWorker) and for tuning each image individually
// during real batch processing — both run inside a Worker.
import { flattenOntoBackground, resizeToMaxDimension } from './offscreenPipeline'
import { encodeImageData, type CodecMimeType } from './wasmCodecs'

const MIN_DIMENSION = 64
const MIN_QUALITY = 0.05

async function encodeAt(
  imageData: ImageData,
  maxDimension: number | undefined,
  quality: number,
  mimeType: CodecMimeType,
): Promise<ArrayBuffer> {
  const resized = maxDimension ? await resizeToMaxDimension(imageData, maxDimension) : imageData
  const working = mimeType === 'image/jpeg' ? await flattenOntoBackground(resized, '#ffffff') : resized
  return encodeImageData(mimeType, working, quality)
}

interface ResolutionSolveInput {
  imageData: ImageData
  mimeType: CodecMimeType
  quality: number
  targetBytes: number
  iterations?: number
}

// Holds quality fixed and binary-searches the max dimension that gets
// closest to (without exceeding, where possible) the target size.
export async function solveResolutionForTargetSize({
  imageData,
  mimeType,
  quality,
  targetBytes,
  iterations = 9,
}: ResolutionSolveInput): Promise<{ maxDimension: number; arrayBuffer: ArrayBuffer }> {
  const nativeMax = Math.max(imageData.width, imageData.height)

  // If full resolution already meets the target, there's nothing to shrink.
  const fullBuffer = await encodeAt(imageData, undefined, quality, mimeType)
  if (fullBuffer.byteLength <= targetBytes) {
    return { maxDimension: nativeMax, arrayBuffer: fullBuffer }
  }

  let low = MIN_DIMENSION
  let high = nativeMax
  let best = { maxDimension: low, arrayBuffer: await encodeAt(imageData, low, quality, mimeType) }

  for (let i = 0; i < iterations; i++) {
    const mid = Math.round((low + high) / 2)
    if (mid === low || mid === high) break
    const arrayBuffer = await encodeAt(imageData, mid, quality, mimeType)
    if (arrayBuffer.byteLength > targetBytes) {
      high = mid
    } else {
      low = mid
      best = { maxDimension: mid, arrayBuffer }
    }
  }

  return best
}

interface QualitySolveInput {
  imageData: ImageData
  mimeType: CodecMimeType
  maxDimension: number | undefined
  targetBytes: number
  iterations?: number
}

// Holds resolution fixed and binary-searches the quality that gets
// closest to (without exceeding, where possible) the target size.
export async function solveQualityForTargetSize({
  imageData,
  mimeType,
  maxDimension,
  targetBytes,
  iterations = 9,
}: QualitySolveInput): Promise<{ quality: number; arrayBuffer: ArrayBuffer }> {
  // If even full quality meets the target, no need to search further down.
  const fullBuffer = await encodeAt(imageData, maxDimension, 1, mimeType)
  if (fullBuffer.byteLength <= targetBytes) {
    return { quality: 1, arrayBuffer: fullBuffer }
  }

  let low = MIN_QUALITY
  let high = 1
  let best = { quality: low, arrayBuffer: await encodeAt(imageData, maxDimension, low, mimeType) }

  for (let i = 0; i < iterations; i++) {
    const mid = (low + high) / 2
    const arrayBuffer = await encodeAt(imageData, maxDimension, mid, mimeType)
    if (arrayBuffer.byteLength > targetBytes) {
      high = mid
    } else {
      low = mid
      best = { quality: mid, arrayBuffer }
    }
  }

  return best
}
