import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: { emit: vi.fn() }
}))

import { applyEditModeMenuState } from 'main_renderer/menu/actions/view'

const menuIds = [
  'editModeMenuItem',
  'sourceCodeModeMenuItem',
  'typewriterModeMenuItem',
  'focusModeMenuItem',
  'saveMenuItem',
  'saveAsMenuItem',
  'autoSaveMenuItem',
  'moveToMenuItem',
  'renameMenuItem'
]

const makeMenu = (sourceCode = false) => {
  const items = new Map(
    menuIds.map((id) => [
      id,
      { id, checked: id === 'sourceCodeModeMenuItem' && sourceCode, enabled: true }
    ])
  )
  items.set('paragraphMenuEntry', {
    id: 'paragraphMenuEntry',
    checked: false,
    enabled: true,
    submenu: { items: [{ enabled: true }] }
  } as never)
  items.set('formatMenuItem', {
    id: 'formatMenuItem',
    checked: false,
    enabled: true,
    submenu: { items: [{ enabled: true }] }
  } as never)

  return {
    items,
    menu: { getMenuItemById: (id: string) => items.get(id) ?? null } as never
  }
}

describe('read-only application menu state', () => {
  it('disables every editor and save command derived from Edit Mode', () => {
    const { items, menu } = makeMenu()

    applyEditModeMenuState(menu, false)

    expect(items.get('editModeMenuItem')?.checked).toBe(false)
    for (const id of menuIds.filter((id) => id !== 'editModeMenuItem')) {
      expect(items.get(id)?.enabled, id).toBe(false)
    }
    expect(
      (
        items.get('paragraphMenuEntry') as never as {
          submenu: { items: Array<{ enabled: boolean }> }
        }
      ).submenu.items[0].enabled
    ).toBe(false)
    expect(
      (items.get('formatMenuItem') as never as { submenu: { items: Array<{ enabled: boolean }> } })
        .submenu.items[0].enabled
    ).toBe(false)
  })

  it('keeps focus and typewriter disabled when source mode is active', () => {
    const { items, menu } = makeMenu(true)

    applyEditModeMenuState(menu, true)

    expect(items.get('sourceCodeModeMenuItem')?.enabled).toBe(true)
    expect(items.get('focusModeMenuItem')?.enabled).toBe(false)
    expect(items.get('typewriterModeMenuItem')?.enabled).toBe(false)
    expect(items.get('saveMenuItem')?.enabled).toBe(true)
    expect(
      (
        items.get('paragraphMenuEntry') as never as {
          submenu: { items: Array<{ enabled: boolean }> }
        }
      ).submenu.items[0].enabled
    ).toBe(false)
  })
})
