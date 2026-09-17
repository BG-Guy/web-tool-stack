// Runs the batch pipeline on a single image: compress, then convert, in
// that fixed order, using only whichever steps are enabled. Each stage
// re-decodes its predecessor's output bytes, so chaining both stages
// produces exactly what running them one after another by hand would —
// including the compounding quality loss that implies. This only ever
// runs inside image.worker.ts, off the main thread.
import { decodeFile, flattenOntoBackground, hasAlpha, resizeToMaxDimension } from './offscreenPipeline'
import { autoCompressFormat, type CompressOptions, type PipelineOptions } from './processImage'
import { solveQualityForTargetSize, solveResolutionForTargetSize } from './sizeEstimate'
import { encodeImageData, type CodecMimeType } from './wasmCodecs'
import type { EstimateInput, EstimateOutput } from './workerProtocol'

interface StageOutput {
  arrayBuffer: ArrayBuffer
  mimeType: CodecMimeType
}

async function runCompressStage(imageData: ImageData, options: CompressOptions): Promise<StageOutput> {
  const mimeType = autoCompressFormat(hasAlpha(imageData))

  if (options.targetSizeKB) {
    const targetBytes = options.targetSizeKB * 1024
    if (options.solveFor === 'quality') {
      const { arrayBuffer } = await solveQualityForTargetSize({
        imageData,
        mimeType,
        maxDimension: options.maxDimension ?? undefined,
        targetBytes,
      })
      return { arrayBuffer, mimeType }
    }
    const { arrayBuffer } = await solveResolutionForTargetSize({
      imageData,
      mimeType,
      quality: options.quality,
      targetBytes,
    })
    return { arrayBuffer, mimeType }
  }

  const resized = options.maxDimension ? await resizeToMaxDimension(imageData, options.maxDimension) : imageData
  const working = mimeType === 'image/jpeg' ? await flattenOntoBackground(resized, '#ffffff') : resized
  const arrayBuffer = await encodeImageData(mimeType, working, options.quality)
  return { arrayBuffer, mimeType }
}

// Processes one file through the enabled pipeline stages and returns the
// final blob plus the mime type it was encoded as. Throws if neither
// stage is enabled, or if the file can't be decoded as an image.
export async function processImageInWorker(
  file: File,
  options: PipelineOptions,
): Promise<{ blob: Blob; mimeType: string }> {
  if (!options.compress.enabled && !options.convert.enabled) {
    throw new Error('No processing operation selected.')
  }

  let imageData = await decodeFile(file)
  let output: StageOutput | null = null

  if (options.compress.enabled) {
    output = await runCompressStage(imageData, options.compress)
    if (options.convert.enabled) {
      // Feed the compressed result into the convert stage.
      imageData = await decodeFile(new Blob([output.arrayBuffer], { type: output.mimeType }))
    }
  }

  if (options.convert.enabled) {
    const targetMime = options.convert.format
    const working =
      targetMime === 'image/jpeg' && hasAlpha(imageData) ? await flattenOntoBackground(imageData, '#ffffff') : imageData
    const arrayBuffer = await encodeImageData(targetMime, working, options.convert.quality)
    output = { arrayBuffer, mimeType: targetMime }
  }

  if (!output) throw new Error('Processing produced no output.')
  return { blob: new Blob([output.arrayBuffer], { type: output.mimeType }), mimeType: output.mimeType }
}

// Powers the Step 2 live target-size preview: decodes the reference image
// once and solves it the same way runCompressStage would, returning only
// the achieved size (the caller doesn't need the encoded bytes).
export async function solveEstimateInWorker(input: EstimateInput): Promise<EstimateOutput> {
  const imageData = await decodeFile(input.file)
  const mimeType = autoCompressFormat(hasAlpha(imageData))

  if (input.solveFor === 'quality') {
    const { quality, arrayBuffer } = await solveQualityForTargetSize({
      imageData,
      mimeType,
      maxDimension: input.maxDimension,
      targetBytes: input.targetBytes,
    })
    return { achievedBytes: arrayBuffer.byteLength, quality }
  }

  const { maxDimension, arrayBuffer } = await solveResolutionForTargetSize({
    imageData,
    mimeType,
    quality: input.quality ?? 0.75,
    targetBytes: input.targetBytes,
  })
  return { achievedBytes: arrayBuffer.byteLength, maxDimension }
}
