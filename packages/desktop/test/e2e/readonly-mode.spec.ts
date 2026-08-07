import { expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from 'playwright'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { clickMenuById, launchElectron, sendIpcToRenderer, waitForMenuReady } from './helpers'

const markdown = `# Reader heading

Use \`iot-device:<env>:v1:cache:device:sn:*\` here.

[Jump](#reader-heading)

\`\`\`mermaid
flowchart LR
  A[Open] --> B[Rendered]
\`\`\`
`

test.describe('default read-only mode', () => {
  let app: ElectronApplication
  let page: Page
  let tempDir: string
  let filePath: string

  test.beforeAll(async() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marktext-readonly-e2e-'))
    filePath = path.join(tempDir, 'reader.md')
    fs.writeFileSync(filePath, markdown, 'utf8')
    const launched = await launchElectron([filePath], { suppressErrorDialog: true })
    app = launched.app
    page = launched.page
    await page.waitForSelector('.readonly-reader .markdown-body', { timeout: 15000 })
    await waitForMenuReady(app)
  })

  test.afterAll(async() => {
    if (app) await app.close()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('renders static HTML without Markdown syntax or editable DOM', async() => {
    await expect(page.locator('.editor-component')).toHaveCount(0)
    await expect(page.locator('[contenteditable="true"]')).toHaveCount(0)
    await expect(page.locator('.readonly-reader')).toContainText(
      'iot-device:<env>:v1:cache:device:sn:*'
    )
    expect(await page.locator('.readonly-reader').innerText()).not.toContain('`')
    await expect(page.locator('.readonly-reader .mermaid svg')).toHaveCount(1)
  })

  test('allows selection and copy without exposing backticks', async() => {
    const inlineCode = page.locator('.readonly-content code').filter({ hasText: 'iot-device' })
    await inlineCode.dblclick()
    const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '')
    expect(selected.length).toBeGreaterThan(0)
    expect(selected).not.toContain('`')

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+C' : 'Control+C')
    const copied = await app.evaluate(({ clipboard }) => clipboard.readText())
    expect(copied).toBe(selected)
  })

  test('disables save and ignores typing in reader mode', async() => {
    const menuState = await app.evaluate(({ Menu }) => {
      const menu = Menu.getApplicationMenu()
      return {
        save: menu?.getMenuItemById('saveMenuItem')?.enabled,
        saveAs: menu?.getMenuItemById('saveAsMenuItem')?.enabled,
        source: menu?.getMenuItemById('sourceCodeModeMenuItem')?.enabled
      }
    })
    expect(menuState).toEqual({ save: false, saveAs: false, source: false })

    await page.locator('.readonly-content').click()
    await page.keyboard.type('MUST_NOT_BE_WRITTEN')
    await sendIpcToRenderer(app, 'mt::editor-ask-file-save')
    await page.waitForTimeout(150)
    expect(fs.readFileSync(filePath, 'utf8')).toBe(markdown)
  })

  test('supports find and internal links', async() => {
    await sendIpcToRenderer(app, 'mt::editor-edit-action', 'find')
    const input = page.locator('.readonly-search input')
    await expect(input).toBeVisible()
    await input.fill('iot-device')
    await expect(page.locator('mark[data-readonly-search]')).toHaveCount(1)

    await page.locator('.readonly-search button[aria-label="Close"]').click()
    await page.locator('.readonly-content a[href="#reader-heading"]').click()
    await expect(page.locator('#reader-heading')).toBeVisible()
  })

  test('requires explicit Edit Mode and returns safely to reader mode', async() => {
    await clickMenuById(app, 'editModeMenuItem')
    await page.waitForSelector('.editor-component', { timeout: 10000 })
    await expect(page.locator('.readonly-reader')).toHaveCount(0)

    await clickMenuById(app, 'editModeMenuItem')
    await page.waitForSelector('.readonly-reader .markdown-body', { timeout: 10000 })
    await expect(page.locator('.editor-component')).toHaveCount(0)
  })
})
