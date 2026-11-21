import { createContext, useContext } from 'react'

export interface TaskControl {
  /** True once the component that queued the task has unmounted. */
  readonly cancelled: boolean
  /** True when the visitor asked to skip the typing animation. */
  readonly fast: boolean
  /** Resolves after `ms`, or immediately when skipping. */
  sleep(ms: number): Promise<void>
}

/**
 * Runs queued tasks one after another. Components enqueue from useEffect,
 * which React runs in document order, so a page types out top to bottom.
 */
export class Sequencer {
  fast = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private tail: Promise<void> = Promise.resolve()
  private pending = 0

  get busy() {
    return this.pending > 0
  }

  /** Returns a function that cancels the task. */
  enqueue(task: (control: TaskControl) => Promise<void> | void): () => void {
    const seq = this
    let cancelled = false
    const control: TaskControl = {
      get cancelled() {
        return cancelled
      },
      get fast() {
        return seq.fast
      },
      sleep: (ms) =>
        seq.fast || ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms)),
    }
    this.pending++
    this.tail = this.tail
      .then(() => (cancelled ? undefined : task(control)))
      .catch((err) => console.error('[sequencer]', err))
      .finally(() => {
        this.pending--
      })
    return () => {
      cancelled = true
    }
  }
}

export const SequencerContext = createContext<Sequencer | null>(null)

const fallback = new Sequencer()
export const useSequencer = () => useContext(SequencerContext) ?? fallback
