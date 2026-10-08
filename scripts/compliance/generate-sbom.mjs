import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pnp = require('pnpapi')

const seen = new Map()
const metadataErrors = []
const resolvedPackageKeys = new Set()
const packageLocators = pnp
  .getAllLocators()
  .filter(locator => locator.name && !locator.reference.startsWith('workspace:'))

for (const locator of packageLocators) {
  const info = pnp.getPackageInformation(locator)
  if (!info?.packageLocation) {
    metadataErrors.push(`${locator.name}@${locator.reference}: no package location`)
    continue
  }
  try {
    const raw = await fs.readFile(path.join(info.packageLocation, 'package.json'), 'utf8')
    const pkg = JSON.parse(raw)
    if (!pkg.name || !pkg.version) {
      metadataErrors.push(
        `${locator.name}@${locator.reference}: package.json lacks name or version`
      )
      continue
    }
    const key = `${pkg.name}@${pkg.version}`
    resolvedPackageKeys.add(key)
    seen.set(key, {
      name: pkg.name,
      version: pkg.version,
      license: typeof pkg.license === 'string' ? pkg.license : 'NOASSERTION',
      repository:
        typeof pkg.repository === 'string'
          ? pkg.repository
          : pkg.repository?.url || '',
    })
  } catch (error) {
    metadataErrors.push(
      `${locator.name}@${locator.reference}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

if (metadataErrors.length) {
  console.error(
    'Unable to read package metadata for the complete Yarn PnP inventory:\n' +
      metadataErrors.map(error => `- ${error}`).join('\n')
  )
  process.exitCode = 2
}

const components = [...seen.values()].sort((a, b) =>
  `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`)
)

await fs.mkdir('artifacts', { recursive: true })

const bom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.6',
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    component: { type: 'application', name: 'underleaf' },
  },
  components: components.map(component => ({
    type: 'library',
    name: component.name,
    version: component.version,
    purl: `pkg:npm/${encodeURIComponent(component.name)}@${encodeURIComponent(component.version)}`,
    licenses: [{ license: { id: component.license } }],
    externalReferences: component.repository
      ? [{ type: 'vcs', url: component.repository.replace(/^git\+/, '') }]
      : undefined,
  })),
}

await fs.writeFile('artifacts/sbom.cdx.json', JSON.stringify(bom, null, 2) + '\n')

const quote = value => '"' + String(value).replaceAll('"', '""') + '"'
const rows = ['name,version,spdx_license,repository']
for (const component of components) {
  rows.push(
    [component.name, component.version, component.license, component.repository]
      .map(quote)
      .join(',')
  )
}
await fs.writeFile('artifacts/third-party-licenses.csv', rows.join('\n') + '\n')

const locatorKeys = new Set(
  packageLocators.map(locator => `${locator.name}@${locator.reference}`)
)
const componentKeys = new Set(
  components.map(component => `${component.name}@${component.version}`)
)
const expectedComponentKeys = [...resolvedPackageKeys].sort()
const reportedComponentKeys = [...componentKeys].sort()
if (
  JSON.stringify(expectedComponentKeys) !== JSON.stringify(reportedComponentKeys) ||
  rows.length - 1 !== components.length
) {
  console.error('SBOM and license inventory row counts do not match.')
  process.exitCode = 2
}
console.error(
  `SBOM inventory: ${componentKeys.size} unique package versions from ${locatorKeys.size} Yarn PnP locators.`
)

const unknown = components.filter(
  component =>
    !component.license ||
    component.license === 'NOASSERTION' ||
    component.license === 'UNLICENSED'
)
if (unknown.length) {
  console.error(
    'Dependencies with unknown/unlicensed metadata:\n' +
      unknown.map(item => `- ${item.name}@${item.version}: ${item.license}`).join('\n')
  )
  process.exitCode = 2
}
