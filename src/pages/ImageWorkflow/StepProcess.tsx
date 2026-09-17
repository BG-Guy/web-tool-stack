// Step 3: review the plan, run it, and watch per-image progress. Each
// image is processed independently — one failure doesn't stop the batch.
import type { PipelineOptions } from '../../lib/processImage'
import type { UploadedImage } from './StepUpload'

export interface ResultItem {
  id: string
  fileName: string
  status: 'pending' | 'processing' | 'done' | 'error'
  originalSize: number
  resultSize?: number
  blob?: Blob
  url?: string
  error?: string
}

interface StepProcessProps {
  images: UploadedImage[]
  options: PipelineOptions
  results: ResultItem[]
  isProcessing: boolean
  onBack: () => void
  onStart: () => void
  onViewResults: () => void
}

function statusIcon(status: ResultItem['status']) {
  switch (status) {
    case 'pending':
      return '•'
    case 'processing':
      return '⋯'
    case 'done':
      return '✓'
    case 'error':
      return '!'
  }
}

export function StepProcess({
  images,
  options,
  results,
  isProcessing,
  onBack,
  onStart,
  onViewResults,
}: StepProcessProps) {
  const hasStarted = results.length > 0
  const allSettled = hasStarted && results.every((r) => r.status === 'done' || r.status === 'error')
  const steps = [options.compress.enabled && 'Compress', options.convert.enabled && 'Convert'].filter(Boolean)

  return (
    <div className="wizard-step">
      <h2 className="wizard-step__title">3. Process</h2>

      {!hasStarted && (
        <>
          <p className="wizard-step__hint">
            Ready to run <strong>{steps.join(' → ')}</strong> on {images.length} image
            {images.length === 1 ? '' : 's'}.
          </p>
          <div className="wizard-step__actions">
            <button type="button" className="btn btn--secondary" onClick={onBack}>
              ← Back
            </button>
            <button type="button" className="btn btn--primary" onClick={onStart}>
              Start Processing
            </button>
          </div>
        </>
      )}

      {hasStarted && (
        <>
          <ul className="progress-list">
            {results.map((result) => (
              <li key={result.id} className={`progress-list__item progress-list__item--${result.status}`}>
                <span className="progress-list__icon" aria-hidden="true">
                  {statusIcon(result.status)}
                </span>
                <span className="progress-list__name">{result.fileName}</span>
                <span className="progress-list__status">
                  {result.status === 'error' ? result.error ?? 'Failed' : result.status}
                </span>
              </li>
            ))}
          </ul>

          <div className="wizard-step__actions">
            <button type="button" className="btn btn--secondary" disabled={isProcessing} onClick={onBack}>
              ← Back
            </button>
            <button type="button" className="btn btn--primary" disabled={!allSettled} onClick={onViewResults}>
              {allSettled ? 'View Results →' : 'Processing…'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
