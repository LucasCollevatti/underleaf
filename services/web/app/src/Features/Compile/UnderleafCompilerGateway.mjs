import { createCompilerService } from './CompilerService.mjs'
import LegacyCompilerClient from './LegacyCompilerClient.mjs'

/**
 * Stable boundary between the web application and compilation.
 *
 * The legacy adapter intentionally remains behind this boundary for this
 * commit. The next step can swap the transport/runtime without changing
 * controller call sites or the request/result contract.
 */
const UnderleafCompilerGateway = createCompilerService(LegacyCompilerClient)

export default UnderleafCompilerGateway
