import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getTexLiveMetadata,
  parseTexLiveVersion,
  resetTexLiveMetadataCache,
} from '../../../app/js/TexLiveVersion.js'

describe('TeX Live metadata', () => {
  afterEach(() => {
    resetTexLiveMetadataCache()
  })

  it('parses the installed TeX Live release from tlmgr output', () => {
    expect(
      parseTexLiveVersion(
        'tlmgr revision 79639\nTeX Live (https://tug.org/texlive) version 2026'
      )
    ).toBe('2026')
  })

  it('caches a successful lookup for a bounded period', async () => {
    const runCommand = vi.fn().mockResolvedValue({
      stdout: 'TeX Live (https://tug.org/texlive) version 2026',
    })

    await expect(getTexLiveMetadata(runCommand)).resolves.toEqual({
      available: true,
      version: '2026',
    })
    await expect(getTexLiveMetadata(runCommand)).resolves.toEqual({
      available: true,
      version: '2026',
    })
    expect(runCommand).toHaveBeenCalledOnce()
  })

  it('reports an unavailable compiler without throwing', async () => {
    const runCommand = vi.fn().mockRejectedValue(new Error('tlmgr failed'))

    await expect(getTexLiveMetadata(runCommand)).resolves.toEqual({
      available: false,
      version: null,
    })
  })
})
