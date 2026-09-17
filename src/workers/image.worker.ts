// Web Worker entry point for the image pipeline. Runs off the main thread
// so decode/resize/encode (all WASM, all CPU-heavy) never blocks the UI,
// and so imageWorkerPool.ts can run several of these in parallel across a
// batch.
import { processImageInWorker, solveEstimateInWorker } from '../lib/pipelineCore'
import type { WorkerRequest, WorkerResponse } from '../lib/workerProtocol'

// Cast away the ambient `self: Window` typing the project's DOM-only lib
// assumes — this file only ever runs as a dedicated worker module, where
// postMessage takes a single argument (no targetOrigin) and onmessage
// receives our own request shape, neither of which match Window's
// signatures.
interface WorkerScope {
  postMessage(message: WorkerResponse): void
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
}

const scope = self as unknown as WorkerScope

scope.onmessage = async (event) => {
  const request = event.data
  try {
    if (request.kind === 'process') {
      const { blob, mimeType } = await processImageInWorker(request.file, request.options)
      scope.postMessage({ kind: 'process-result', id: request.id, blob, mimeType })
      return
    }
    const result = await solveEstimateInWorker(request)
    scope.postMessage({ kind: 'estimate-result', id: request.id, ...result })
  } catch (err) {
    scope.postMessage({
      kind: 'error',
      id: request.id,
      message: err instanceof Error ? err.message : 'Processing failed.',
    })
  }
}
