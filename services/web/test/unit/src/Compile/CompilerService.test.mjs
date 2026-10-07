import { describe, expect, it, vi } from 'vitest'
import { createCompilerService } from '../../../../app/src/Features/Compile/CompilerService.mjs'

const METHODS = [
  'compile',
  'compileSubmission',
  'deleteAuxFiles',
  'getProjectCompileLimits',
  'stopCompile',
  'syncTeX',
  'wordCount',
]

describe('CompilerService', function () {
  it('forwards request objects without exposing implementation signatures', async function () {
    const client = Object.fromEntries(
      METHODS.map(method => [
        method,
        vi.fn(async request => ({ method, request })),
      ])
    )
    const service = createCompilerService(client)
    const request = { projectId: 'project-id', userId: 'user-id' }

    for (const method of METHODS) {
      await expect(service[method](request)).resolves.toEqual({
        method,
        request,
      })
      expect(client[method]).toHaveBeenCalledWith(request)
    }
  })

  it('rejects incomplete compiler clients at construction time', function () {
    expect(() => createCompilerService({})).toThrow(
      'compiler client must implement compile()'
    )
  })
})
