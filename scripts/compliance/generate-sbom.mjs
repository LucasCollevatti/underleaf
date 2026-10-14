import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pnp = require('pnpapi')

const seen = new Map()
const metadataErrors = []
const skippedOptionalLocators = []
const resolvedPackageKeys = new Set()
const materializedLocatorKeys = new Set()
const packageLocators = pnp
  .getAllLocators()
  .filter(
    locator => locator.name && !locator.reference.startsWith('workspace:')
  )

const licenseAliases = new Map([
  ['Apache License, Version 2.0', 'Apache-2.0'],
  ['Apache License 2.0', 'Apache-2.0'],
  ['The MIT License', 'MIT'],
  ['The MIT License (MIT)', 'MIT'],
  ['MIT License', 'MIT'],
])

const normalizeLicense = license => {
  if (typeof license !== 'string') return undefined
  const normalized = license.trim()
  return licenseAliases.get(normalized) || normalized
}

let licenseOverrides = {}
try {
  licenseOverrides = JSON.parse(
    await fs.readFile('compliance/license-overrides.json', 'utf8')
  )
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

const readLicenseReview = async () => {
  try {
    return JSON.parse(
      await fs.readFile('compliance/license-review.json', 'utf8')
    )
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(
        'compliance/license-review.json is required for the release inventory',
        { cause: error }
      )
    }
    throw error
  }
}

const licenseReview = await readLicenseReview()

const licensePolicy = JSON.parse(
  await fs.readFile('compliance/license-policy.json', 'utf8')
)

const policyPatternMatches = (license, pattern) => {
  if (pattern === 'dual-or-multi-license expressions') {
    return /\b(?:OR|AND)\b|[()]/.test(license)
  }
  const escapedPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replaceAll('\\*', '.*')
  return new RegExp(`^${escapedPattern}$`).test(license)
}

const requiresManualReview = license =>
  (licensePolicy.manualReviewRequired || []).some(pattern =>
    policyPatternMatches(license, pattern)
  )

const licenseReviewEntries = licenseReview.packages || []
const licenseReviewByKey = new Map()
for (const entry of licenseReviewEntries) {
  const key = `${entry.name}@${entry.version}`
  if (licenseReviewByKey.has(key)) {
    throw new Error(`Duplicate license review entry: ${key}`)
  }
  licenseReviewByKey.set(key, entry)
}

const getPackageLicense = pkg => {
  const declaredLicense = normalizeLicense(pkg.license)
  if (declaredLicense)
    return { license: declaredLicense, source: 'package.json' }

  if (Array.isArray(pkg.licenses)) {
    const declaredLicenses = pkg.licenses
      .map(entry => normalizeLicense(entry?.type || entry?.name))
      .filter(Boolean)
    if (declaredLicenses.length) {
      return {
        license: declaredLicenses.join(' OR '),
        source: 'package.json:licenses',
      }
    }
  }

  return undefined
}

const isOptionalDependencyLocator = async locator => {
  for (const parentLocator of pnp.getAllLocators()) {
    if (
      parentLocator.name === locator.name &&
      parentLocator.reference === locator.reference
    ) {
      continue
    }
    const parentInfo = pnp.getPackageInformation(parentLocator)
    const dependencyReference = parentInfo?.packageDependencies?.get(
      locator.name
    )
    if (
      dependencyReference !== locator.reference ||
      !parentInfo?.packageLocation
    ) {
      continue
    }
    try {
      const parentPackage = JSON.parse(
        await fs.readFile(
          path.join(parentInfo.packageLocation, 'package.json'),
          'utf8'
        )
      )
      if (parentPackage.optionalDependencies?.[locator.name]) return true
    } catch {
      // The parent metadata is not needed to report the original locator error.
    }
  }
  return false
}

for (const locator of packageLocators) {
  const info = pnp.getPackageInformation(locator)
  if (!info?.packageLocation) {
    metadataErrors.push(
      `${locator.name}@${locator.reference}: no package location`
    )
    continue
  }
  try {
    const raw = await fs.readFile(
      path.join(info.packageLocation, 'package.json'),
      'utf8'
    )
    const pkg = JSON.parse(raw)
    if (!pkg.name || !pkg.version) {
      metadataErrors.push(
        `${locator.name}@${locator.reference}: package.json lacks name or version`
      )
      continue
    }
    const key = `${pkg.name}@${pkg.version}`
    resolvedPackageKeys.add(key)
    materializedLocatorKeys.add(`${locator.name}@${locator.reference}`)
    const declaredLicense = getPackageLicense(pkg)
    const override = licenseOverrides.packages?.[key]
    const review = licenseReviewByKey.get(key)
    seen.set(key, {
      name: pkg.name,
      version: pkg.version,
      license: declaredLicense?.license || override?.license || 'NOASSERTION',
      licenseSource:
        declaredLicense?.source ||
        override?.source ||
        'missing package metadata',
      licenseReview: override?.review || review?.decision || '',
      repository:
        typeof pkg.repository === 'string'
          ? pkg.repository
          : pkg.repository?.url || '',
    })
  } catch (error) {
    if (
      error?.code === 'ENOENT' &&
      (await isOptionalDependencyLocator(locator))
    ) {
      skippedOptionalLocators.push(`${locator.name}@${locator.reference}`)
      continue
    }
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

await fs.writeFile(
  'artifacts/sbom.cdx.json',
  JSON.stringify(bom, null, 2) + '\n'
)

const quote = value => '"' + String(value).replaceAll('"', '""') + '"'
const rows = [
  'name,version,spdx_license,license_source,license_review,repository',
]
for (const component of components) {
  rows.push(
    [
      component.name,
      component.version,
      component.license,
      component.licenseSource,
      component.licenseReview,
      component.repository,
    ]
      .map(quote)
      .join(',')
  )
}
await fs.writeFile('artifacts/third-party-licenses.csv', rows.join('\n') + '\n')

const locatorKeys = new Set(materializedLocatorKeys)
const componentKeys = new Set(
  components.map(component => `${component.name}@${component.version}`)
)
const expectedComponentKeys = [...resolvedPackageKeys].sort()
const reportedComponentKeys = [...componentKeys].sort()
if (
  JSON.stringify(expectedComponentKeys) !==
    JSON.stringify(reportedComponentKeys) ||
  rows.length - 1 !== components.length
) {
  console.error('SBOM and license inventory row counts do not match.')
  process.exitCode = 2
}
console.error(
  `SBOM inventory: ${componentKeys.size} unique package versions from ${locatorKeys.size} materialized Yarn PnP locators.`
)
if (skippedOptionalLocators.length) {
  console.error(
    `Skipped ${skippedOptionalLocators.length} optional locators not materialized for this platform:\n` +
      skippedOptionalLocators.map(locator => `- ${locator}`).join('\n')
  )
}

const unknownOverrideKeys = Object.keys(licenseOverrides.packages || {}).filter(
  key => {
    if (componentKeys.has(key)) return false
    const packageName = key.slice(0, key.lastIndexOf('@'))
    return packageLocators.some(locator => locator.name === packageName)
  }
)
if (unknownOverrideKeys.length) {
  console.error(
    'License overrides do not match generated components:\n' +
      unknownOverrideKeys.map(key => `- ${key}`).join('\n')
  )
  process.exitCode = 2
}

const reviewErrors = []
for (const entry of licenseReviewEntries) {
  const key = `${entry.name}@${entry.version}`
  const component = seen.get(key)
  if (!component) {
    reviewErrors.push(`${key}: not present in the generated inventory`)
    continue
  }
  if (component.license !== entry.license) {
    reviewErrors.push(
      `${key}: review says ${entry.license}, inventory says ${component.license}`
    )
  }
  if (entry.status !== 'approved') {
    reviewErrors.push(`${key}: review status is ${entry.status || 'missing'}`)
  }
}
if (reviewErrors.length) {
  console.error(
    'License review does not match the generated inventory:\n' +
      reviewErrors.map(error => `- ${error}`).join('\n')
  )
  process.exitCode = 2
}

const policyReviewErrors = []
for (const component of components) {
  if (!requiresManualReview(component.license)) continue
  const key = `${component.name}@${component.version}`
  if (!licenseReviewByKey.has(key)) {
    policyReviewErrors.push(
      `${key}: ${component.license} requires an approved manual license review`
    )
  }
}
if (policyReviewErrors.length) {
  console.error(
    'License policy requires missing manual reviews:\n' +
      policyReviewErrors.map(error => `- ${error}`).join('\n')
  )
  process.exitCode = 2
}

const distributedReviewErrors = []
for (const entry of licenseReview.distributedComponents || []) {
  if (!entry.name || !entry.version || !entry.license || !entry.source) {
    distributedReviewErrors.push(
      `${entry.name || '<unnamed>'}: incomplete distributed component record`
    )
    continue
  }
  if (entry.package) {
    const component = seen.get(entry.package)
    if (!component) {
      distributedReviewErrors.push(
        `${entry.name}: package ${entry.package} is not present in the generated inventory`
      )
      continue
    }
    const expectedLicense = entry.inventoryLicense || entry.license
    if (component.license !== expectedLicense) {
      distributedReviewErrors.push(
        `${entry.name}: distributed record does not match ${entry.package}`
      )
    }
  }
}
if (distributedReviewErrors.length) {
  console.error(
    'Distributed component review is incomplete:\n' +
      distributedReviewErrors.map(error => `- ${error}`).join('\n')
  )
  process.exitCode = 2
}

const unknown = components.filter(
  component =>
    !component.license ||
    component.license === 'NOASSERTION' ||
    component.license === 'UNLICENSED'
)
if (unknown.length) {
  console.error(
    'Dependencies with unknown/unlicensed metadata:\n' +
      unknown
        .map(item => `- ${item.name}@${item.version}: ${item.license}`)
        .join('\n')
  )
  process.exitCode = 2
}
