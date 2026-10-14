import { ESLint } from 'eslint'
import path from 'node:path'

const repositoryRoot = path.resolve(import.meta.dirname, '../..')

const files = [
  'eslint.config.mjs',
  'scripts/quality',
  'scripts/compliance/generate-sbom.mjs',
  'services/web/scripts/lezer-latex/generate.mjs',
  'services/web/app/src/Features/Underleaf',
  'services/web/app/src/Features/Compile/UnderleafCompilerGateway.mjs',
  'services/web/frontend/js/features/underleaf-auth',
  'services/web/frontend/js/features/underleaf-admin',
  'services/web/frontend/js/features/underleaf-system',
  'services/web/frontend/js/features/underleaf',
  'services/web/frontend/js/features/share-project-modal/components/underleaf-share-modal-content.tsx',
  'services/web/frontend/js/pages/underleaf-auth.tsx',
  'services/web/frontend/js/pages/underleaf-admin.tsx',
  'services/web/frontend/js/pages/underleaf-system.tsx',
  'services/web/frontend/js/shared/components/underleaf',
  'services/web/frontend/js/infrastructure/event-tracking.ts',
  'services/web/frontend/js/infrastructure/fetch-json.ts',
  'services/web/frontend/js/shared/context/editor-context.tsx',
  'services/web/frontend/js/shared/context/types/project-metadata.tsx',
  'services/web/frontend/js/utils/meta.ts',
  'services/web/frontend/js/features/history/utils/history-details.ts',
  'services/web/test/frontend/features/underleaf-auth',
  'services/web/test/frontend/features/underleaf-admin',
  'services/web/test/frontend/features/underleaf-system',
  'services/web/test/frontend/features/underleaf-identity',
  'services/web/test/frontend/shared/components/underleaf',
]

const fix = process.argv.includes('--fix')
const eslint = new ESLint({
  cache: true,
  cacheLocation: path.join(repositoryRoot, '.cache', 'eslint'),
  cwd: repositoryRoot,
  fix,
})

let results = await eslint.lintFiles(files)
if (fix) {
  await ESLint.outputFixes(results)
  results = await eslint.lintFiles(files)
}

const formatter = await eslint.loadFormatter('stylish')
process.stdout.write(formatter.format(results))

const errorCount = results.reduce(
  (total, result) => total + result.errorCount,
  0
)
const warningCount = results.reduce(
  (total, result) => total + result.warningCount,
  0
)

if (errorCount > 0 || warningCount > 0) {
  process.exitCode = 1
}
