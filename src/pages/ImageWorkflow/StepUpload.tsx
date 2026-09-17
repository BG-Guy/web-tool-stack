// Step 1: pick one or more images. Non-image files are rejected up front
// (drag-and-drop bypasses the file picker's own type filter, so this is
// the actual enforcement point) and listed so the user knows why.
import { DropZone } from '../../components/DropZone/DropZone'
import { formatBytes } from '../../lib/imageProcessing'

export interface UploadedImage {
  id: string
  file: File
  previewUrl: string
}

interface StepUploadProps {
  images: UploadedImage[]
  rejectedNames: string[]
  onFilesAdded: (files: File[]) => void
  onRemoveImage: (id: string) => void
  onNext: () => void
}

export function StepUpload({ images, rejectedNames, onFilesAdded, onRemoveImage, onNext }: StepUploadProps) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step__title">1. Add your images</h2>
      <p className="wizard-step__hint">Drop in as many images as you want to process together.</p>

      <DropZone accept="image/*" multiple onFiles={onFilesAdded} label="Drop images here, or click to browse" />

      {rejectedNames.length > 0 && (
        <p className="wizard-step__warning">
          Skipped {rejectedNames.length === 1 ? 'a file that' : `${rejectedNames.length} files that`} didn't
          look like images: {rejectedNames.join(', ')}
        </p>
      )}

      {images.length > 0 && (
        <ul className="upload-grid">
          {images.map((image) => (
            <li key={image.id} className="upload-card">
              <img src={image.previewUrl} alt={image.file.name} className="upload-card__thumb" />
              <div className="upload-card__meta">
                <span className="upload-card__name">{image.file.name}</span>
                <span className="upload-card__size">{formatBytes(image.file.size)}</span>
              </div>
              <button
                type="button"
                className="upload-card__remove"
                aria-label={`Remove ${image.file.name}`}
                onClick={() => onRemoveImage(image.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="wizard-step__actions">
        <span className="wizard-step__count">
          {images.length} image{images.length === 1 ? '' : 's'} added
        </span>
        <button type="button" className="btn btn--primary" disabled={images.length === 0} onClick={onNext}>
          Next: Choose Operations →
        </button>
      </div>
    </div>
  )
}
