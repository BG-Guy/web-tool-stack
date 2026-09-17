// Local (non-AI) content-aware fill: given a canvas and a mask of pixels
// to erase, blends nearby unmasked pixels inward until the masked area
// looks plausible. This is a pixel-diffusion approximation (solves a
// Laplace-style smoothing equation), not a neural model — it reconstructs
// flat colors and gradients well, but detail on busy textures comes out
// soft rather than reconstructed.

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

// Caps the resolution the diffusion solver runs at. Larger masked areas
// are downscaled first and upscaled back, since solver cost scales with
// area * iterations and we want this to stay responsive on big photos.
const MAX_WORKING_SIZE = 400
const ITERATIONS = 300
const MASK_ALPHA_THRESHOLD = 10

// Finds the smallest box containing every masked (non-transparent) pixel
// in maskCanvas, padded so the solver has real image data to blend from.
// Returns null if nothing is masked.
function getMaskBounds(maskCanvas: HTMLCanvasElement, padding: number): Bounds | null {
  const ctx = maskCanvas.getContext('2d')
  if (!ctx) return null
  const { width, height } = maskCanvas
  const { data } = ctx.getImageData(0, 0, width, height)

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > MASK_ALPHA_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null

  const x = Math.max(0, minX - padding)
  const y = Math.max(0, minY - padding)
  return {
    x,
    y,
    width: Math.min(width, maxX + padding + 1) - x,
    height: Math.min(height, maxY + padding + 1) - y,
  }
}

// Repeatedly averages each masked pixel with its 4 neighbors, leaving
// unmasked pixels fixed as boundary values. This converges to a smooth
// interpolation across the masked region (identical to solving Laplace's
// equation with the unmasked ring as the boundary condition). Sweeping in
// alternating directions each pass speeds up convergence noticeably over
// a single fixed raster order.
function diffuseInPlace(data: Uint8ClampedArray, mask: Uint8Array, width: number, height: number) {
  const buf = new Float32Array(data.length)
  buf.set(data)

  // Seed masked pixels with the average of the unmasked ring so the
  // solver starts close to the answer instead of from raw zeros.
  const sums = [0, 0, 0, 0]
  let count = 0
  for (let p = 0; p < width * height; p++) {
    if (!mask[p]) {
      count++
      for (let c = 0; c < 4; c++) sums[c] += buf[p * 4 + c]
    }
  }
  const means = count > 0 ? sums.map((s) => s / count) : [255, 255, 255, 255]
  for (let p = 0; p < width * height; p++) {
    if (mask[p]) {
      for (let c = 0; c < 4; c++) buf[p * 4 + c] = means[c]
    }
  }

  for (let iteration = 0; iteration < ITERATIONS; iteration++) {
    const forward = iteration % 2 === 0
    const yStart = forward ? 0 : height - 1
    const yEnd = forward ? height : -1
    const yStep = forward ? 1 : -1
    const xStart = forward ? 0 : width - 1
    const xEnd = forward ? width : -1
    const xStep = forward ? 1 : -1

    for (let y = yStart; y !== yEnd; y += yStep) {
      for (let x = xStart; x !== xEnd; x += xStep) {
        const p = y * width + x
        if (!mask[p]) continue
        const left = (x > 0 ? p - 1 : p) * 4
        const right = (x < width - 1 ? p + 1 : p) * 4
        const up = (y > 0 ? p - width : p) * 4
        const down = (y < height - 1 ? p + width : p) * 4
        const base = p * 4
        for (let c = 0; c < 4; c++) {
          buf[base + c] = (buf[left + c] + buf[right + c] + buf[up + c] + buf[down + c]) / 4
        }
      }
    }
  }

  data.set(buf)
}

// Fills the masked area of `canvas` in place, blending it from the pixels
// surrounding it in `maskCanvas`'s marked region. Returns false (no-op)
// if nothing was masked.
export function inpaintMaskedRegion(
  canvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
): boolean {
  const bounds = getMaskBounds(maskCanvas, 24)
  if (!bounds) return false

  const ctx = canvas.getContext('2d')
  const maskCtx = maskCanvas.getContext('2d')
  if (!ctx || !maskCtx) return false

  const original = ctx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height)
  const softMask = maskCtx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height)

  // Downscale the working copy for large masked areas so the solver's
  // cost (area * iterations) stays bounded regardless of source resolution.
  const scale = Math.min(1, MAX_WORKING_SIZE / Math.max(bounds.width, bounds.height))
  const workWidth = Math.max(1, Math.round(bounds.width * scale))
  const workHeight = Math.max(1, Math.round(bounds.height * scale))

  const workCanvas = document.createElement('canvas')
  workCanvas.width = workWidth
  workCanvas.height = workHeight
  const workCtx = workCanvas.getContext('2d')!
  workCtx.drawImage(canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, workWidth, workHeight)

  const workMaskCanvas = document.createElement('canvas')
  workMaskCanvas.width = workWidth
  workMaskCanvas.height = workHeight
  const workMaskCtx = workMaskCanvas.getContext('2d')!
  workMaskCtx.drawImage(
    maskCanvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    workWidth,
    workHeight,
  )

  const workImageData = workCtx.getImageData(0, 0, workWidth, workHeight)
  const workMaskData = workMaskCtx.getImageData(0, 0, workWidth, workHeight)
  const booleanMask = new Uint8Array(workWidth * workHeight)
  for (let p = 0; p < booleanMask.length; p++) {
    booleanMask[p] = workMaskData.data[p * 4 + 3] > MASK_ALPHA_THRESHOLD ? 1 : 0
  }

  diffuseInPlace(workImageData.data, booleanMask, workWidth, workHeight)
  workCtx.putImageData(workImageData, 0, 0)

  // Upscale the filled result back to the bounds' full resolution.
  const filledCanvas = document.createElement('canvas')
  filledCanvas.width = bounds.width
  filledCanvas.height = bounds.height
  const filledCtx = filledCanvas.getContext('2d')!
  filledCtx.imageSmoothingEnabled = true
  filledCtx.drawImage(workCanvas, 0, 0, workWidth, workHeight, 0, 0, bounds.width, bounds.height)
  const filled = filledCtx.getImageData(0, 0, bounds.width, bounds.height)

  // Blend the fill into the original using the mask's own soft alpha, so
  // brush edges fade in smoothly instead of leaving a hard seam, and any
  // untouched pixel stays byte-for-byte identical to the source.
  const result = ctx.createImageData(bounds.width, bounds.height)
  for (let p = 0; p < bounds.width * bounds.height; p++) {
    const alpha = softMask.data[p * 4 + 3] / 255
    for (let c = 0; c < 3; c++) {
      const i = p * 4 + c
      result.data[i] = original.data[i] * (1 - alpha) + filled.data[i] * alpha
    }
    result.data[p * 4 + 3] = original.data[p * 4 + 3]
  }

  ctx.putImageData(result, bounds.x, bounds.y)
  return true
}
