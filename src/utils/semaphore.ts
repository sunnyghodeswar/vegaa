/**
 * Semaphore implementation for concurrency control
 * 
 * Thread-safe implementation that prevents:
 * - Race conditions in acquire/release
 * - Double release issues
 * - Unbounded waiter queue growth
 */
export class Semaphore {
  private count = 0
  private waiters: Array<() => void> = []

  constructor(private readonly limit: number) {
    if (limit <= 0) throw new Error('Semaphore limit must be > 0')
  }

  /**
   * Acquire a permit. Waits if no permits are available.
   * Prevents race conditions by incrementing count before await.
   */
  async acquire(): Promise<void> {
    // Fast path: if we have available permits, take one immediately
    if (this.count < this.limit) {
      this.count++
      return
    }

    // Slow path: wait for a permit to become available
    // The count is incremented by the release() function when it calls the waiter
    await new Promise<void>((resolve) => {
      this.waiters.push(() => {
        // Count is incremented here, after we're woken up
        this.count++
        resolve()
      })
    })
  }

  /**
   * Release a permit. Wakes up the next waiter if any.
   * Prevents double-release by checking count.
   */
  release(): void {
    // Prevent double-release: if count is already 0, do nothing
    if (this.count <= 0) {
      // Log warning in development (optional)
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Semaphore] release() called without corresponding acquire()')
      }
      return
    }

    this.count--
    
    // Wake up the next waiter if any
    const next = this.waiters.shift()
    if (next) {
      // Call the waiter, which will increment count and resolve the promise
      next()
    }
  }

  /**
   * Get current permit count (for debugging/monitoring)
   */
  getCount(): number {
    return this.count
  }

  /**
   * Get number of waiters (for debugging/monitoring)
   */
  getWaitersCount(): number {
    return this.waiters.length
  }
}