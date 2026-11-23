/// <reference lib="webworker" />
import type { RawData } from '../types'
import { optimize, type OptimizerInput } from './core'

let dataPromise: Promise<RawData> | null = null
const getData = (url: string) => (dataPromise ??= fetch(url).then((r) => r.json()))

self.onmessage = async (e: MessageEvent<{ input: OptimizerInput; dataUrl: string }>) => {
  try {
    const data = await getData(e.data.dataUrl)
    const out = optimize(data, e.data.input, (found, checked) => self.postMessage({ type: 'progress', found, checked }))
    self.postMessage({ type: 'done', out })
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) })
  }
}
