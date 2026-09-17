// Shared drag-and-drop / click-to-browse file picker, used by every
// image tool page so they don't each reimplement drag events.
import { useRef, useState, type DragEvent } from 'react'
import './DropZone.css'

interface DropZoneProps {
  accept: string
  onFile: (file: File) => void
  label?: string
}

export function DropZone({ accept, onFile, label }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Accepts a drop or a file-picker selection the same way.
  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      className={`drop-zone${isDragOver ? ' drop-zone--active' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e: DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        handleFiles(e.dataTransfer.files)
      }}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="drop-zone__label">{label ?? 'Drop a file here, or click to browse'}</p>
    </div>
  )
}
