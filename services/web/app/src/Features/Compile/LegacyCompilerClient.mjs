import CompileManager from './CompileManager.mjs'
import ClsiManager from './ClsiManager.mjs'

const LegacyCompilerClient = {
  async compile({ projectId, userId, options }) {
    return await CompileManager.promises.compile(projectId, userId, options)
  },

  async compileSubmission({ submissionId, body, options }) {
    return await ClsiManager.promises.sendExternalRequest(
      submissionId,
      body,
      options
    )
  },

  async deleteAuxFiles({ projectId, userId, clsiServerId }) {
    return await CompileManager.promises.deleteAuxFiles(
      projectId,
      userId,
      clsiServerId
    )
  },

  async getProjectCompileLimits({ projectId }) {
    return await CompileManager.promises.getProjectCompileLimits(projectId)
  },

  async stopCompile({ projectId, userId }) {
    return await CompileManager.promises.stopCompile(projectId, userId)
  },

  async syncTeX({ projectId, userId, options }) {
    return await CompileManager.promises.syncTeX(projectId, userId, options)
  },

  async wordCount({
    projectId,
    userId,
    file,
    clsiServerId,
    rootResourcePath,
  }) {
    return await CompileManager.promises.wordCount(
      projectId,
      userId,
      file,
      clsiServerId,
      rootResourcePath
    )
  },
}

export default LegacyCompilerClient
