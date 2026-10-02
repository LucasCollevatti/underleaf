import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import Path from 'node:path'

import CommandRunner from '../../../app/js/LocalCommandRunner.js'

describe('LocalCommandRunner', () => {
  const temporaryDirectories = []

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true })
    }
    delete process.env.OVERLEAF_SESSION_SECRET
  })

  it('does not pass application secrets to TeX processes', async () => {
    process.env.OVERLEAF_SESSION_SECRET = 'must-not-leak'
    const directory = fs.mkdtempSync(
      Path.join(os.tmpdir(), 'underleaf-compile-env-')
    )
    temporaryDirectories.push(directory)

    const output = await CommandRunner.promises.run(
      'environment-test',
      [
        process.execPath,
        '-e',
        "process.stdout.write(process.env.OVERLEAF_SESSION_SECRET || 'missing')",
      ],
      directory,
      undefined,
      1000,
      { OVERLEAF_SESSION_SECRET: 'also-must-not-leak' },
      undefined,
      undefined
    )

    expect(output.stdout).toBe('missing')
  })

  it('terminates a compile that exceeds its wall-clock timeout', async () => {
    const directory = fs.mkdtempSync(
      Path.join(os.tmpdir(), 'underleaf-compile-timeout-')
    )
    temporaryDirectories.push(directory)

    await expect(
      CommandRunner.promises.run(
        'timeout-test',
        [process.execPath, '-e', 'setTimeout(() => {}, 10000)'],
        directory,
        undefined,
        50,
        {},
        undefined,
        undefined
      )
    ).rejects.toMatchObject({ terminated: true })
  })
})
