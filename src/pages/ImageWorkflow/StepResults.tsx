// Step 4: show what came out, and let the user download it — one at a
// time or all together as a zip.
import { formatBytes } from '../../lib/imageProcessing'
import type { ResultItem } from './StepProcess'

interface StepResultsProps {
  results: ResultItem[]
  onDownloadOne: (result: ResultItem) => void
  onDownloadAll: () => void
  onStartOver: () => void
}

export function StepResults({ results, onDownloadOne, onDownloadAll, onStartOver }: StepResultsProps) {
  const done = results.filter((r) => r.status === 'done')
  const failed = results.filter((r) => r.status === 'error')

  return (
    <div className="wizard-step">
      <h2 className="wizard-step__title">4. Download your images</h2>
      <p className="wizard-step__hint">
        {done.length} of {results.length} image{results.length === 1 ? '' : 's'} processed successfully
        {failed.length > 0 ? `, ${failed.length} failed` : ''}.
      </p>

      <div className="wizard-step__actions wizard-step__actions--top">
        <button type="button" className="btn btn--primary" disabled={done.length === 0} onClick={onDownloadAll}>
          Download All (.zip)
        </button>
        <button type="button" className="btn btn--secondary" onClick={onStartOver}>
          Start Over
        </button>
      </div>

      <ul className="results-grid">
        {results.map((result) => (
          <li key={result.id} className="result-card">
            {result.status === 'done' && result.url ? (
              <img src={result.url} alt={result.fileName} className="result-card__thumb" />
            ) : (
              <div className="result-card__thumb result-card__thumb--error">Failed</div>
            )}
            <div className="result-card__meta">
              <span className="result-card__name">{result.fileName}</span>
              {result.status === 'done' && result.resultSize !== undefined ? (
                <span className="result-card__size">
                  {formatBytes(result.originalSize)} → {formatBytes(result.resultSize)}
                </span>
              ) : (
                <span className="result-card__error">{result.error ?? 'Processing failed'}</span>
              )}
            </div>
            <button
              type="button"
              className="btn btn--secondary result-card__download"
              disabled={result.status !== 'done'}
              onClick={() => onDownloadOne(result)}
            >
              Download
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
