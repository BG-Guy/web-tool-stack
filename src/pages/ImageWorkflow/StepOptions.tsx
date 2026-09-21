// Step 2: pick which operations to run. Options always execute in a
// fixed, efficient order — Compress, then Convert — regardless of the
// order the boxes were checked in, so the summary spells that out.
//
// The compress card has an optional "target file size": once set,
// whichever of quality/max-dimension you drag becomes the fixed input,
// and the other is solved for live via real trial encodes of the first
// uploaded image, run in a Worker (see lib/imageWorkerPool.ts /
// lib/sizeEstimate.ts) — there's no formula for this, only actually
// re-encoding the image tells you the real answer, and running it off
// the main thread keeps the slider from janking while it does.
import { useEffect, useRef, useState } from 'react'
import { formatBytes } from '../../lib/imageProcessing'
import { imageWorkerPool } from '../../lib/imageWorkerPool'
import type { PipelineOptions } from '../../lib/processImage'

type OptionsUpdate = PipelineOptions | ((prev: PipelineOptions) => PipelineOptions)

interface StepOptionsProps {
  options: PipelineOptions
  onChange: (update: OptionsUpdate) => void
  referenceImage: HTMLImageElement | null
  referenceFile: File | null
  onBack: () => void
  onNext: () => void
}

type EstimateState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'done'; achievedBytes: number }

function supportsQuality(mimeType: string) {
  return mimeType === 'image/jpeg' || mimeType === 'image/webp' || mimeType === 'image/avif'
}

// Mirrors drawImageToCanvas's own scaling so the displayed dimensions
// match what will actually be produced.
function displayDims(image: HTMLImageElement, maxDimension: number) {
  const { naturalWidth: w, naturalHeight: h } = image
  if (Math.max(w, h) <= maxDimension) return { width: w, height: h }
  const scale = maxDimension / Math.max(w, h)
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

export function StepOptions({ options, onChange, referenceImage, referenceFile, onBack, onNext }: StepOptionsProps) {
  const hasSelection = options.compress.enabled || options.convert.enabled
  const { compress } = options
  const [estimate, setEstimate] = useState<EstimateState>({ status: 'idle' })
  const requestIdRef = useRef(0)

  // Debounced (250ms) live re-solve: recomputes whichever of quality /
  // max-dimension isn't the current driver, whenever the target size,
  // the driver's value, or the reference image changes. Applies its
  // result via a functional update so an in-flight solve can never
  // clobber an unrelated edit (e.g. to the Convert card) made in the
  // meantime with a stale snapshot of `options`.
  useEffect(() => {
    if (!compress.enabled || !compress.targetSizeKB || !referenceFile) {
      setEstimate({ status: 'idle' })
      return
    }

    const requestId = ++requestIdRef.current
    setEstimate({ status: 'loading' })
    const targetSizeKB = compress.targetSizeKB
    const solveFor = compress.solveFor
    const driverQuality = compress.quality
    const driverMaxDimension = compress.maxDimension

    const timer = setTimeout(async () => {
      try {
        const targetBytes = targetSizeKB * 1024
        const result = await imageWorkerPool.estimate({
          file: referenceFile,
          solveFor,
          quality: driverQuality,
          maxDimension: driverMaxDimension ?? undefined,
          targetBytes,
        })
        if (requestIdRef.current !== requestId) return
        setEstimate({ status: 'done', achievedBytes: result.achievedBytes })

        if (solveFor === 'quality' && result.quality !== undefined) {
          const quality = result.quality
          onChange((prev) =>
            Math.abs(quality - prev.compress.quality) > 0.005
              ? { ...prev, compress: { ...prev.compress, quality } }
              : prev,
          )
        } else if (solveFor === 'resolution' && result.maxDimension !== undefined) {
          const maxDimension = result.maxDimension
          onChange((prev) =>
            maxDimension !== prev.compress.maxDimension
              ? { ...prev, compress: { ...prev.compress, maxDimension } }
              : prev,
          )
        }
      } catch {
        if (requestIdRef.current === requestId) setEstimate({ status: 'error' })
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [
    compress.enabled,
    compress.targetSizeKB,
    compress.solveFor,
    compress.quality,
    compress.maxDimension,
    referenceFile,
    onChange,
  ])

  const sliderMaxDimension = Math.max(
    referenceImage ? Math.max(referenceImage.naturalWidth, referenceImage.naturalHeight) : 4000,
    compress.maxDimension ?? 0,
    100,
  )

  function setCompress(patch: Partial<PipelineOptions['compress']>) {
    onChange({ ...options, compress: { ...compress, ...patch } })
  }

  return (
    <div className="wizard-step">
      <h2 className="wizard-step__title">2. Choose what to do</h2>
      <p className="wizard-step__hint">Select at least one operation. Both can run together.</p>

      <div className="option-card">
        <label className="option-card__header">
          <input
            type="checkbox"
            checked={compress.enabled}
            onChange={(e) => setCompress({ enabled: e.target.checked })}
          />
          <span className="option-card__title">Compress images</span>
        </label>
        <p className="option-card__description">Shrink file size by re-encoding at a lower quality.</p>

        {compress.enabled && (
          <div className="option-card__body">
            <label className="field">
              Target file size (optional)
              <input
                type="range"
                min={20}
                max={5000}
                step={10}
                value={compress.targetSizeKB ?? 500}
                onChange={(e) => setCompress({ targetSizeKB: Number(e.target.value) })}
              />
              <div className="field__row">
                <input
                  type="number"
                  min={1}
                  placeholder="No target"
                  value={compress.targetSizeKB ?? ''}
                  onChange={(e) =>
                    setCompress({ targetSizeKB: e.target.value ? Number(e.target.value) : null })
                  }
                />
                <span className="field__unit">KB</span>
                {compress.targetSizeKB !== null && (
                  <button type="button" className="field__clear" onClick={() => setCompress({ targetSizeKB: null })}>
                    Turn off
                  </button>
                )}
              </div>
              {compress.targetSizeKB !== null && (
                <p className="field__estimate">
                  {estimate.status === 'loading' && 'Calculating from your first image…'}
                  {estimate.status === 'error' && "Couldn't estimate this — try a different target size."}
                  {estimate.status === 'done' &&
                    `≈ ${formatBytes(estimate.achievedBytes)} for your first image (target: ${formatBytes(
                      compress.targetSizeKB * 1024,
                    )}). Each image is fine-tuned individually when processing.`}
                  {estimate.status === 'idle' && !referenceImage && 'Preparing a live estimate from your first image…'}
                </p>
              )}
            </label>

            <label className="field">
              Quality: {Math.round(compress.quality * 100)}%
              {compress.targetSizeKB !== null && compress.solveFor === 'quality' && (
                <span className="field__tag">calculated for target size</span>
              )}
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={compress.quality}
                onChange={(e) => setCompress({ quality: Number(e.target.value), solveFor: 'resolution' })}
              />
            </label>

            <label className="field">
              Max dimension:{' '}
              {referenceImage
                ? (() => {
                    const { width, height } = displayDims(referenceImage, compress.maxDimension ?? sliderMaxDimension)
                    return `${width} × ${height}px`
                  })()
                : `${compress.maxDimension ?? 'original'}px`}
              {compress.targetSizeKB !== null && compress.solveFor === 'resolution' && (
                <span className="field__tag">calculated for target size</span>
              )}
              <input
                type="range"
                min={100}
                max={sliderMaxDimension}
                step={10}
                value={compress.maxDimension ?? sliderMaxDimension}
                onChange={(e) => setCompress({ maxDimension: Number(e.target.value), solveFor: 'quality' })}
              />
              <div className="field__row">
                <input
                  type="number"
                  min={16}
                  placeholder="No resize"
                  value={compress.maxDimension ?? ''}
                  onChange={(e) =>
                    setCompress({
                      maxDimension: e.target.value ? Number(e.target.value) : null,
                      solveFor: 'quality',
                    })
                  }
                />
                <span className="field__unit">px</span>
              </div>
            </label>
          </div>
        )}
      </div>

      <div className="option-card">
        <label className="option-card__header">
          <input
            type="checkbox"
            checked={options.convert.enabled}
            onChange={(e) =>
              onChange({ ...options, convert: { ...options.convert, enabled: e.target.checked } })
            }
          />
          <span className="option-card__title">Convert format</span>
        </label>
        <p className="option-card__description">Convert every image to PNG, JPEG, WebP, or AVIF.</p>

        {options.convert.enabled && (
          <div className="option-card__body">
            <label className="field">
              Target format
              <select
                value={options.convert.format}
                onChange={(e) =>
                  onChange({
                    ...options,
                    convert: { ...options.convert, format: e.target.value as PipelineOptions['convert']['format'] },
                  })
                }
              >
                <option value="image/png">PNG</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/webp">WebP</option>
                <option value="image/avif">AVIF</option>
              </select>
            </label>
            {supportsQuality(options.convert.format) && (
              <label className="field">
                Quality: {Math.round(options.convert.quality * 100)}%
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={options.convert.quality}
                  onChange={(e) =>
                    onChange({
                      ...options,
                      convert: { ...options.convert, quality: Number(e.target.value) },
                    })
                  }
                />
              </label>
            )}
          </div>
        )}
      </div>

      {options.compress.enabled && options.convert.enabled && (
        <p className="wizard-step__note">
          Order: images are compressed first, then converted. A target file size on the compress
          step applies to that step's output — converting afterward may change the final size.
        </p>
      )}

      <div className="wizard-step__actions">
        <button type="button" className="btn btn--secondary" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="btn btn--primary" disabled={!hasSelection} onClick={onNext}>
          Next: Process →
        </button>
      </div>
    </div>
  )
}
