// The whole app is this one page: a strict 4-step wizard for batch image
// processing. State here is the single source of truth for which step
// is active and how far the user has gotten — steps ahead of maxReached
// are locked in the Stepper and never rendered as reachable, so nothing
// can run out of order.
import { useEffect, useState } from 'react'
import { downloadBlob, loadImageFromFile, replaceExtension } from '../../lib/imageProcessing'
import { imageWorkerPool } from '../../lib/imageWorkerPool'
import { buildZip, type PipelineOptions } from '../../lib/processImage'
import { Stepper, type WizardStep } from './Stepper'
import { StepUpload, type UploadedImage } from './StepUpload'
import { StepOptions } from './StepOptions'
import { StepProcess, type ResultItem } from './StepProcess'
import { StepResults } from './StepResults'
import './ImageWorkflow.css'

const DEFAULT_OPTIONS: PipelineOptions = {
  compress: { enabled: true, quality: 0.75, maxDimension: 1920, targetSizeKB: null, solveFor: 'resolution' },
  convert: { enabled: false, format: 'image/webp', quality: 0.85 },
}

export function ImageWorkflow() {
  const [step, setStep] = useState<WizardStep>(1)
  const [maxReached, setMaxReached] = useState<WizardStep>(1)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [rejectedNames, setRejectedNames] = useState<string[]>([])
  const [options, setOptions] = useState<PipelineOptions>(DEFAULT_OPTIONS)
  const [results, setResults] = useState<ResultItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [referenceImage, setReferenceImage] = useState<HTMLImageElement | null>(null)

  // Decodes the first uploaded image so Step 2 can run live target-size
  // estimates against real pixel data without decoding on every keystroke.
  useEffect(() => {
    const firstFile = images[0]?.file
    if (!firstFile) {
      setReferenceImage(null)
      return
    }
    let cancelled = false
    loadImageFromFile(firstFile)
      .then((img) => {
        if (!cancelled) setReferenceImage(img)
      })
      .catch(() => {
        if (!cancelled) setReferenceImage(null)
      })
    return () => {
      cancelled = true
    }
  }, [images])

  function goToStep(target: WizardStep) {
    if (target <= maxReached) setStep(target)
  }

  function advanceTo(target: WizardStep) {
    setStep(target)
    setMaxReached((current) => (target > current ? target : current))
  }

  // Splits a drag-and-drop or file-picker selection into images and
  // rejects — dropped files bypass the <input accept> filter entirely,
  // so this is the actual point where non-images are caught.
  function handleFilesAdded(files: File[]) {
    const accepted: UploadedImage[] = []
    const rejected: string[] = []
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        accepted.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) })
      } else {
        rejected.push(file.name)
      }
    }
    if (accepted.length > 0) setImages((prev) => [...prev, ...accepted])
    if (rejected.length > 0) setRejectedNames((prev) => [...prev, ...rejected])
  }

  function handleRemoveImage(id: string) {
    setImages((prev) => {
      const target = prev.find((image) => image.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((image) => image.id !== id)
    })
  }

  // Runs the pipeline over every image in parallel, dispatched to a pool
  // of Web Workers (see lib/imageWorkerPool.ts) so a batch uses several
  // CPU cores at once instead of processing one image at a time on the
  // main thread. Each image updates its own row independently as it
  // settles; a single image failing (corrupt file, unsupported encode,
  // etc.) is caught and recorded per-row rather than aborting the batch.
  async function handleStartProcessing() {
    setIsProcessing(true)
    setResults(
      images.map((image) => ({
        id: image.id,
        fileName: image.file.name,
        status: 'pending',
        originalSize: image.file.size,
      })),
    )

    await Promise.all(
      images.map(async (image) => {
        setResults((prev) => prev.map((r) => (r.id === image.id ? { ...r, status: 'processing' } : r)))
        try {
          const { blob, mimeType } = await imageWorkerPool.process(image.file, options)
          const url = URL.createObjectURL(blob)
          const fileName = replaceExtension(image.file.name, mimeType)
          setResults((prev) =>
            prev.map((r) =>
              r.id === image.id
                ? { ...r, status: 'done', blob, url, resultSize: blob.size, fileName }
                : r,
            ),
          )
        } catch (err) {
          setResults((prev) =>
            prev.map((r) =>
              r.id === image.id
                ? { ...r, status: 'error', error: err instanceof Error ? err.message : 'Processing failed.' }
                : r,
            ),
          )
        }
      }),
    )

    setIsProcessing(false)
  }

  function handleDownloadOne(result: ResultItem) {
    if (result.blob) downloadBlob(result.blob, result.fileName)
  }

  async function handleDownloadAll() {
    const done = results.filter((r): r is ResultItem & { blob: Blob } => r.status === 'done' && !!r.blob)
    if (done.length === 0) return
    const zip = await buildZip(done.map((r) => ({ name: r.fileName, blob: r.blob })))
    downloadBlob(zip, 'processed-images.zip')
  }

  function handleStartOver() {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    results.forEach((result) => result.url && URL.revokeObjectURL(result.url))
    setImages([])
    setRejectedNames([])
    setResults([])
    setStep(1)
    setMaxReached(1)
  }

  return (
    <div className="workflow">
      <header className="workflow__hero">
        <p className="workflow__eyebrow">Web Tool Stack</p>
        <h1 className="workflow__title">Batch Image Workflow</h1>
        <p className="workflow__subtitle">
          Upload a batch of images, pick what to do to them, and download the results — every
          step runs locally in your browser.
        </p>
      </header>

      <Stepper current={step} maxReached={maxReached} onNavigate={goToStep} />

      <div className="workflow__panel">
        {step === 1 && (
          <StepUpload
            images={images}
            rejectedNames={rejectedNames}
            onFilesAdded={handleFilesAdded}
            onRemoveImage={handleRemoveImage}
            onNext={() => advanceTo(2)}
          />
        )}

        {step === 2 && (
          <StepOptions
            options={options}
            onChange={setOptions}
            referenceImage={referenceImage}
            referenceFile={images[0]?.file ?? null}
            onBack={() => goToStep(1)}
            onNext={() => {
              // Entering Step 3 always starts from a clean slate — otherwise
              // going back to tweak options after a run and hitting Next
              // again would show the previous run's stale results instead
              // of a fresh "ready to process" screen.
              setResults([])
              advanceTo(3)
            }}
          />
        )}

        {step === 3 && (
          <StepProcess
            images={images}
            options={options}
            results={results}
            isProcessing={isProcessing}
            onBack={() => goToStep(2)}
            onStart={handleStartProcessing}
            onViewResults={() => advanceTo(4)}
          />
        )}

        {step === 4 && (
          <StepResults
            results={results}
            onDownloadOne={handleDownloadOne}
            onDownloadAll={handleDownloadAll}
            onStartOver={handleStartOver}
          />
        )}
      </div>
    </div>
  )
}
