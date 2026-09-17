// Message contract shared between imageWorkerPool.ts (main thread) and
// image.worker.ts (the worker thread it talks to).
import type { PipelineOptions } from './processImage'

export interface EstimateInput {
  file: File
  maxDimension?: number
  quality?: number
  targetBytes: number
  solveFor: 'resolution' | 'quality'
}

export interface EstimateOutput {
  achievedBytes: number
  quality?: number
  maxDimension?: number
}

export interface ProcessRequest {
  kind: 'process'
  id: string
  file: File
  options: PipelineOptions
}

export interface EstimateRequest extends EstimateInput {
  kind: 'estimate'
  id: string
}

export type WorkerRequest = ProcessRequest | EstimateRequest

export interface ProcessResponse {
  kind: 'process-result'
  id: string
  blob: Blob
  mimeType: string
}

export interface EstimateResponse extends EstimateOutput {
  kind: 'estimate-result'
  id: string
}

export interface ErrorResponse {
  kind: 'error'
  id: string
  message: string
}

export type WorkerResponse = ProcessResponse | EstimateResponse | ErrorResponse
