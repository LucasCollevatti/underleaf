import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const CACHE_TTL_MS = 5 * 60 * 1000
const COMMAND_TIMEOUT_MS = 5 * 1000
const MAX_OUTPUT_BYTES = 16 * 1024

let cachedResult
let cachedAt = 0

export function parseTexLiveVersion(output) {
  const match = String(output).match(/TeX Live[^\n]*version\s+(\d{4})/i)
  return match?.[1] || null
}

export async function getTexLiveMetadata(runCommand = execFileAsync) {
  const now = Date.now()
  if (cachedResult && now - cachedAt < CACHE_TTL_MS) return cachedResult

  try {
    const { stdout } = await runCommand(
      'tlmgr',
      ['--version'],
      { timeout: COMMAND_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES }
    )
    const version = parseTexLiveVersion(stdout)
    if (!version) throw new Error('TeX Live version was not found')
    cachedResult = { available: true, version }
  } catch {
    cachedResult = { available: false, version: null }
  }
  cachedAt = now
  return cachedResult
}

export function resetTexLiveMetadataCache() {
  cachedResult = undefined
  cachedAt = 0
}
