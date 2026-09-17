// Step 2: pick which operations to run. Options always execute in a
// fixed, efficient order — Compress, then Convert — regardless of the
// order the boxes were checked in, so the summary spells that out.
import type { PipelineOptions } from '../../lib/processImage'

interface StepOptionsProps {
  options: PipelineOptions
  onChange: (options: PipelineOptions) => void
  onBack: () => void
  onNext: () => void
}

function supportsQuality(mimeType: string) {
  return mimeType === 'image/jpeg' || mimeType === 'image/webp'
}

export function StepOptions({ options, onChange, onBack, onNext }: StepOptionsProps) {
  const hasSelection = options.compress.enabled || options.convert.enabled

  return (
    <div className="wizard-step">
      <h2 className="wizard-step__title">2. Choose what to do</h2>
      <p className="wizard-step__hint">Select at least one operation. Both can run together.</p>

      <div className="option-card">
        <label className="option-card__header">
          <input
            type="checkbox"
            checked={options.compress.enabled}
            onChange={(e) =>
              onChange({ ...options, compress: { ...options.compress, enabled: e.target.checked } })
            }
          />
          <span className="option-card__title">Compress images</span>
        </label>
        <p className="option-card__description">Shrink file size by re-encoding at a lower quality.</p>

        {options.compress.enabled && (
          <div className="option-card__body">
            <label className="field">
              Quality: {Math.round(options.compress.quality * 100)}%
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={options.compress.quality}
                onChange={(e) =>
                  onChange({
                    ...options,
                    compress: { ...options.compress, quality: Number(e.target.value) },
                  })
                }
              />
            </label>
            <label className="field">
              Max dimension (px, optional)
              <input
                type="number"
                min={16}
                placeholder="No resize"
                value={options.compress.maxDimension ?? ''}
                onChange={(e) =>
                  onChange({
                    ...options,
                    compress: {
                      ...options.compress,
                      maxDimension: e.target.value ? Number(e.target.value) : null,
                    },
                  })
                }
              />
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
        <p className="option-card__description">Convert every image to PNG, JPEG, or WebP.</p>

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
        <p className="wizard-step__note">Order: images are compressed first, then converted.</p>
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
