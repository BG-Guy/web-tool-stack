// Composites a photo into a frame graphic: the photo is center-cropped to
// match the frame's own aspect ratio (so it fills the frame's window with
// no distortion), scaled to the frame's native resolution, then the frame
// is drawn on top — the frame image should have a transparent window so
// the photo shows through.
import { cropToAspectRatio } from './imageProcessing'

export function compositeFrame(photo: HTMLImageElement, frame: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = frame.naturalWidth
  canvas.height = frame.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context is not available.')

  const croppedPhoto = cropToAspectRatio(photo, frame.naturalWidth, frame.naturalHeight)
  ctx.drawImage(croppedPhoto, 0, 0, canvas.width, canvas.height)
  ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)

  return canvas
}
