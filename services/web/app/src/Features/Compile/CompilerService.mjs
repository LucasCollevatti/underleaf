const REQUIRED_METHODS = [
  'compile',
  'compileSubmission',
  'deleteAuxFiles',
  'getProjectCompileLimits',
  'stopCompile',
  'syncTeX',
  'wordCount',
]

export function createCompilerService(client) {
  for (const method of REQUIRED_METHODS) {
    if (typeof client?.[method] !== 'function') {
      throw new TypeError(`compiler client must implement ${method}()`)
    }
  }

  return Object.freeze(
    Object.fromEntries(
      REQUIRED_METHODS.map(method => [
        method,
        async request => await client[method](request),
      ])
    )
  )
}
