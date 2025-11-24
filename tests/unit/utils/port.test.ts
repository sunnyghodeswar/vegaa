import { findAvailablePort } from '../../../src/utils/port';
import net from 'net';

describe('Port Utilities', () => {
  let testServer: net.Server | null = null;

  afterEach(() => {
    if (testServer) {
      testServer.close();
      testServer = null;
    }
  });

  describe('findAvailablePort()', () => {
    it('should find available port', async () => {
      const port = await findAvailablePort(30000);
      expect(port).toBeGreaterThanOrEqual(30000);
      expect(port).toBeLessThan(30010);
    });

    it('should find next available port if first is busy', async () => {
      // Occupy a port
      testServer = net.createServer();
      await new Promise<void>((resolve) => {
        testServer!.listen(30000, () => resolve());
      });

      const port = await findAvailablePort(30000);
      expect(port).toBeGreaterThan(30000);
    });

    it('should use default port 3000', async () => {
      const port = await findAvailablePort();
      expect(port).toBeGreaterThanOrEqual(3000);
    });
  });
});

