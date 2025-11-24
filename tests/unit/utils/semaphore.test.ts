import { Semaphore } from '../../../src/utils/semaphore';

describe('Semaphore', () => {
  it('should allow concurrent operations up to limit', async () => {
    const sem = new Semaphore(2);
    const results: number[] = [];
    
    const task = async (id: number) => {
      await sem.acquire();
      try {
        results.push(id);
        await new Promise(resolve => setTimeout(resolve, 10));
      } finally {
        sem.release();
      }
    };

    await Promise.all([task(1), task(2), task(3)]);
    
    expect(results.length).toBe(3);
  });

  it('should limit concurrent operations', async () => {
    const sem = new Semaphore(1);
    let running = 0;
    let maxRunning = 0;
    
    const task = async () => {
      await sem.acquire();
      try {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise(resolve => setTimeout(resolve, 10));
        running--;
      } finally {
        sem.release();
      }
    };

    await Promise.all([task(), task(), task()]);
    
    expect(maxRunning).toBe(1);
  });

  it('should handle zero limit', () => {
    expect(() => new Semaphore(0)).not.toThrow();
  });

  it('should handle negative limit', () => {
    const sem = new Semaphore(-1);
    expect(sem).toBeDefined();
  });
});

