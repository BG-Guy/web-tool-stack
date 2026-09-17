// Thin wrappers around the jSquash WASM codecs (mozjpeg, webp, avif,
// oxipng — the same encoders Squoosh uses) and the WASM lanczos3 resizer.
// These replace the browser's built-in canvas.toBlob() encoder: the native
// encoders give no control over encoder settings and are typically several
// percent to tens of percent larger than the reference encoders at the
// same visual quality. Everything here is safe to call from a Worker or
// the main thread — the codecs self-initialize on first use.
import { encode as encodeAvif } from '@jsquash/avif'
import { encode as encodeJpeg } from '@jsquash/jpeg'
import { optimise as optimisePng } from '@jsquash/oxipng'
import resize from '@jsquash/resize'
import { encode as encodeWebp } from '@jsquash/webp'

export type CodecMimeType = 'image/jpeg' | 'image/webp' | 'image/avif' | 'image/png'

// Our UI works in 0-1 quality (matching the old canvas.toBlob convention);
// every jSquash codec takes 0-100.
function toCodecQuality(quality: number): number {
  return Math.round(Math.min(1, Math.max(0, quality)) * 100)
}

// Encodes raw pixels with the codec matching mimeType. PNG has no lossy
// quality lever — oxipng only losslessly re-compresses (better DEFLATE
// search and filter selection than the browser's baseline PNG encoder),
// so `quality` is ignored for it, same as it was for canvas.toBlob.
export async function encodeImageData(
  mimeType: CodecMimeType,
  imageData: ImageData,
  quality: number,
): Promise<ArrayBuffer> {
  switch (mimeType) {
    case 'image/jpeg':
      return encodeJpeg(imageData, { quality: toCodecQuality(quality) })
    case 'image/webp':
      return encodeWebp(imageData, { quality: toCodecQuality(quality) })
    case 'image/avif':
      return encodeAvif(imageData, { quality: toCodecQuality(quality) })
    case 'image/png':
      return optimisePng(imageData)
  }
}

// Resizes via the WASM lanczos3 filter, which holds detail noticeably
// better than canvas drawImage's bilinear/bicubic scaling at the same
// output size — a sharper result for the same byte budget.
export async function resizeImageData(imageData: ImageData, width: number, height: number): Promise<ImageData> {
  return resize(imageData, { width, height })
}
