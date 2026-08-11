import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const desktopPackagePath = path.resolve(import.meta.dirname, '../../../package.json')
const builderConfigPath = path.resolve(import.meta.dirname, '../../../electron-builder.yml')
const ripgrepPackagePath = path.resolve(
  path.dirname(require.resolve('@vscode/ripgrep')),
  '../package.json'
)

const readJson = (filename: string): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(filename, 'utf8')) as Record<string, unknown>

describe('ripgrep packaging', () => {
  it('declares every platform binary as a direct optional dependency', () => {
    const desktopPackage = readJson(desktopPackagePath)
    const ripgrepPackage = readJson(ripgrepPackagePath)

    expect(desktopPackage.optionalDependencies).toMatchObject(
      ripgrepPackage.optionalDependencies as Record<string, string>
    )
  })

  it('unpacks the ripgrep executable from app.asar', () => {
    const builderConfig = fs.readFileSync(builderConfigPath, 'utf8')

    expect(builderConfig).toContain('node_modules/@vscode/ripgrep-*/bin/**')
  })
})
