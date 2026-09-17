// Pool of Web Workers that run the image pipeline in parallel across a
// batch, instead of the main thread processing one image at a time. Tasks
// are dispatched round-robin over a fixed set of workers, so a batch of N
// images uses roughly min(N, pool size) CPU cores at once rather than
// blocking on one image at a time.
import type { PipelineOptions } from './processImage'
import type { EstimateInput, EstimateOutput, WorkerRequest, WorkerResponse } from './workerProtocol'

export interface ProcessResult {
  blob: Blob
  mimeType: string
}

const POOL_SIZE = Math.max(1, Math.min(4, navigator.hardwareConcurrency || 2))

class ImageWorkerPool {
  private workers: Worker[] = []
  private nextWorker = 0
  private pending = new Map<string, (response: WorkerResponse) => void>()

  private ensureWorkers() {
    if (this.workers.length > 0) return
    for (let i = 0; i < POOL_SIZE; i++) {
      const worker = new Worker(new URL('../workers/image.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const resolve = this.pending.get(event.data.id)
        if (!resolve) return
        this.pending.delete(event.data.id)
        resolve(event.data)
      }
      this.workers.push(worker)
    }
  }

  private nextWorkerInstance(): Worker {
    const worker = this.workers[this.nextWorker]
    this.nextWorker = (this.nextWorker + 1) % this.workers.length
    return worker
  }

  private dispatch(request: WorkerRequest): Promise<WorkerResponse> {
    this.ensureWorkers()
    const worker = this.nextWorkerInstance()
    return new Promise((resolve) => {
      this.pending.set(request.id, resolve)
      worker.postMessage(request)
    })
  }

  async process(file: File, options: PipelineOptions): Promise<ProcessResult> {
    const response = await this.dispatch({ kind: 'process', id: crypto.randomUUID(), file, options })
    if (response.kind === 'error') throw new Error(response.message)
    if (response.kind !== 'process-result') throw new Error('Unexpected worker response.')
    return { blob: response.blob, mimeType: response.mimeType }
  }

  async estimate(input: EstimateInput): Promise<EstimateOutput> {
    const response = await this.dispatch({ kind: 'estimate', id: crypto.randomUUID(), ...input })
    if (response.kind === 'error') throw new Error(response.message)
    if (response.kind !== 'estimate-result') throw new Error('Unexpected worker response.')
    const { achievedBytes, quality, maxDimension } = response
    return { achievedBytes, quality, maxDimension }
  }
}

export const imageWorkerPool = new ImageWorkerPool()
