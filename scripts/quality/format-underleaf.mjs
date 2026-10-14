import fs from 'node:fs/promises'
import path from 'node:path'
import * as prettier from 'prettier'
import { qualityFiles } from './quality-files.mjs'

const repositoryRoot = path.resolve(import.meta.dirname, '../..')
const fix = process.argv.includes('--fix')
let failures = 0

for (const relativePath of qualityFiles) {
  const filePath = path.join(repositoryRoot, relativePath)
  const source = await fs.readFile(filePath, 'utf8')
  const options = (await prettier.resolveConfig(filePath)) || {}
  const formatted = await prettier.format(source, {
    ...options,
    filepath: filePath,
  })

  if (formatted === source) continue

  if (fix) {
    await fs.writeFile(filePath, formatted)
  } else {
    console.error(`[warn] ${relativePath}`)
    failures += 1
  }
}

if (failures > 0) {
  console.error(`Code style issues found in ${failures} files.`)
  process.exitCode = 1
}
