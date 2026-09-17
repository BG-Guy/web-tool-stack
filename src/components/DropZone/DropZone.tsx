// Shared drag-and-drop / click-to-browse file picker, used by every
// image tool page so they don't each reimplement drag events. Pass
// `multiple` + `onFiles` for a batch picker, or the original single-file
// `onFile` for tools that only ever work on one image at a time.
import { useRef, useState, type DragEvent } from 'react'
import './DropZone.css'

interface DropZoneProps {
  accept: string
  onFile?: (file: File) => void
  onFiles?: (files: File[]) => void
  multiple?: boolean
  label?: string
}

export function DropZone({ accept, onFile, onFiles, multiple, label }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Accepts a drop or a file-picker selection the same way.
  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    if (onFiles) {
      onFiles(Array.from(files))
    } else {
      onFile?.(files[0])
    }
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
        multiple={multiple}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="drop-zone__label">
        {label ?? (multiple ? 'Drop images here, or click to browse' : 'Drop a file here, or click to browse')}
      </p>
    </div>
  )
}
