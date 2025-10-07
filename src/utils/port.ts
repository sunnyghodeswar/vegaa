import net from "net"
import cluster from "cluster"

/**
 * 🧠 findAvailablePort()
 * Finds the first available port starting from `startPort`.
 * If running in cluster worker → reuses master's assigned port (VEGAA_PORT).
 * Avoids noisy logs and handles common race conditions gracefully.
 */
export async function findAvailablePort(startPort = 3000, maxAttempts = 10): Promise<number> {
  // 👷 Worker mode: reuse shared port assigned by master
  if (process.env.CLUSTER === "true" && cluster.isWorker && process.env.PORT) {
    return Number(process.env.PORT)
  }

  // 🧭 Scan ports sequentially
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    const free = await isPortFree(port)
    if (free) {
      if (port !== startPort) {
        console.warn(`⚠️ Port ${startPort} is busy, switching to ${port}`)
      }
      return port
    }
  }

  throw new Error(
    `❌ No available ports found from ${startPort} to ${startPort + maxAttempts - 1}`
  )
}

/**
 * 🔍 isPortFree()
 * Checks if a given TCP port is available.
 */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()

    tester.once("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        resolve(false)
      } else {
        console.error(`⚠️ Port check failed on ${port}: ${err.message}`)
        resolve(false)
      }
    })

    tester.once("listening", () => {
      tester.close(() => resolve(true))
    })

    // IPv4 binding for portability (skip IPv6 complexity)
    tester.listen(port, "0.0.0.0")
  })
}