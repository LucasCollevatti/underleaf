import { createCompilerService } from './CompilerService.mjs'
import LegacyCompilerClient from './LegacyCompilerClient.mjs'

/**
 * Boundary between the web application and the current compiler service.
 */
const UnderleafCompilerGateway = createCompilerService(LegacyCompilerClient)

export default UnderleafCompilerGateway
