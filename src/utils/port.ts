import net from "net"

/**
 * Finds the first available port starting from the given number.
 * If the given port is busy, it logs and moves to the next one.
 */
export async function findAvailablePort(startPort = 3000, maxAttempts = 10): Promise<number> {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    const free = await isPortFree(port)
    if (free) {
      if (port !== startPort) {
        console.warn(`⚠️ Port ${startPort} is busy, switching to ${port}`)
      }
      return port
    }
  }
  throw new Error(`❌ No available ports found between ${startPort} and ${startPort + maxAttempts - 1}`)
}

/**
 * Checks whether a TCP port is available.
 */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createServer()
    socket.once("error", (err: any) => {
      if (err.code === "EADDRINUSE") resolve(false)
      else resolve(false)
    })
    socket.once("listening", () => {
      socket.close(() => resolve(true))
    })
    socket.listen(port, "0.0.0.0")
  })
}