import { describe, expect, it, vi } from 'vitest'

const { popupContextMenu } = vi.hoisted(() => ({ popupContextMenu: vi.fn() }))

vi.mock('@/i18n', () => ({ t: (key: string) => key }))
vi.mock('@/contextMenu/sideBar/actions', () => ({
  newFile: vi.fn(),
  newDirectory: vi.fn(),
  copy: vi.fn(),
  cut: vi.fn(),
  paste: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
  showInFolder: vi.fn()
}))
vi.mock('@/contextMenu/popupMenu', () => ({ popupContextMenu }))

import { showContextMenu } from '@/contextMenu/sideBar'

describe('read-only sidebar context menu', () => {
  it('keeps read operations enabled and disables every filesystem mutation', () => {
    showContextMenu({ clientX: 1, clientY: 2 }, true, false)

    const items = popupContextMenu.mock.calls[0][0] as Array<{
      id?: string
      enabled?: boolean
    }>
    const byId = (id: string) => items.find((item) => item.id === id)

    for (const id of [
      'newFileMenuItem',
      'newDirectoryMenuItem',
      'cutMenuItem',
      'pasteMenuItem',
      'renameMenuItem',
      'deleteMenuItem'
    ]) {
      expect(byId(id)?.enabled, id).toBe(false)
    }
    expect(byId('copyMenuItem')?.enabled).not.toBe(false)
    expect(byId('showInFolderMenuItem')?.enabled).not.toBe(false)
  })
})
