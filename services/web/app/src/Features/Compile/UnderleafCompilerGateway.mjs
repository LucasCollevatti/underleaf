import CompileManager from './CompileManager.mjs'

/**
 * Internal boundary between the web application and the compile backend.
 *
 * The gateway accepts a request object instead of exposing CompileManager's
 * argument order to callers. This keeps the web layer independent from the
 * current CLSI implementation while preserving the existing result shape for
 * the editor and output handlers.
 */
const UnderleafCompilerGateway = {
  async compile({ projectId, userId, options }) {
    return await CompileManager.promises.compile(projectId, userId, options)
  },
}

export default UnderleafCompilerGateway

