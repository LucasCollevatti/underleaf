import { createRequire } from 'node:module'

import { fetchJson } from '@overleaf/fetch-utils'
import Settings from '@overleaf/settings'

const require = createRequire(import.meta.url)
const { version: releaseVersion } = require('../../../../../../package.json')

const RUNTIME_LOOKUP_TIMEOUT_MS = 5 * 1000
const DEFAULT_TEXLIVE_SOURCE = 'texlive/texlive:latest'

function getTexLiveSource() {
  return String(
    process.env.UNDERLEAF_TEXLIVE_IMAGE || DEFAULT_TEXLIVE_SOURCE
  ).slice(0, 256)
}

export async function getUnderleafRuntimeInfo() {
  const endpoint = new URL(
    '/internal/diagnostics/texlive',
    Settings.apis.clsi.url
  )
  let texLiveVersion = null

  try {
    const metadata = await fetchJson(endpoint, {
      signal: AbortSignal.timeout(RUNTIME_LOOKUP_TIMEOUT_MS),
    })
    if (
      metadata?.available === true &&
      typeof metadata.version === 'string' &&
      /^\d{4}$/.test(metadata.version)
    ) {
      texLiveVersion = metadata.version
    }
  } catch {
    // The administration page remains usable when the compiler is unavailable.
  }

  return {
    releaseVersion,
    texLiveVersion,
    texLiveSource: getTexLiveSource(),
  }
}
