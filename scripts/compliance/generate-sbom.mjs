import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pnp = require('pnpapi')

const seen = new Map()
for (const locator of pnp.getAllLocators()) {
  if (!locator.name || locator.reference.startsWith('workspace:')) continue
  const info = pnp.getPackageInformation(locator)
  if (!info?.packageLocation) continue
  try {
    const raw = await fs.readFile(path.join(info.packageLocation, 'package.json'), 'utf8')
    const pkg = JSON.parse(raw)
    if (!pkg.name || !pkg.version) continue
    const key = `${pkg.name}@${pkg.version}`
    seen.set(key, {
      name: pkg.name,
      version: pkg.version,
      license: typeof pkg.license === 'string' ? pkg.license : 'NOASSERTION',
      repository:
        typeof pkg.repository === 'string'
          ? pkg.repository
          : pkg.repository?.url || '',
    })
  } catch {
    // Packages without readable metadata are represented explicitly below.
  }
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
