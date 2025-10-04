export class Semaphore {
  private count = 0
  private waiters: Array<() => void> = []

  constructor(private readonly limit: number) {
    if (limit <= 0) throw new Error('Semaphore limit must be > 0')
  }

  async acquire(): Promise<void> {
    if (this.count < this.limit) {
      this.count++
      return
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve))
    this.count++
  }

  release(): void {
    this.count = Math.max(0, this.count - 1)
    const next = this.waiters.shift()
    if (next) next()
  }
}