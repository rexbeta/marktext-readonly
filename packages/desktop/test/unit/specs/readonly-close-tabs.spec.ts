import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.hoisted(() => {
  const w = globalThis as unknown as {
    window?: {
      path?: { sep: string; dirname: (path: string) => string }
      electron?: {
        clipboard: { writeText: (text: string) => void }
        ipcRenderer: { send: (...args: unknown[]) => void; on: (...args: unknown[]) => void }
      }
    }
  }
  w.window ??= {}
  w.window.path ??= { sep: '/', dirname: (path: string) => path }
  w.window.electron ??= {
    clipboard: { writeText: () => {} },
    ipcRenderer: { send: () => {}, on: () => {} }
  }
})

vi.mock('@/services/notification', () => ({
  default: { notify: vi.fn(), name: 'notify' }
}))

import { useEditorStore } from '@/store/editor'
import { usePreferencesStore } from '@/store/preferences'
import type { IFileState } from '@shared/types/files'

const makeTab = (id: string, isSaved: boolean): IFileState =>
  ({
    id,
    filename: `${id}.md`,
    pathname: `/tmp/${id}.md`,
    markdown: `${id} body`,
    isSaved,
    encoding: { encoding: 'utf8', isBom: false },
    lineEnding: 'lf',
    adjustLineEndingOnSave: false,
    trimTrailingNewline: 2
  }) as IFileState

describe('editor store - closing dirty tabs in read-only mode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    usePreferencesStore().SET_MODE({ type: 'editMode', checked: false })
    vi.clearAllMocks()
  })

  it('asks for explicit discard confirmation instead of leaving one dirty tab stuck', () => {
    const store = useEditorStore()
    const dirty = makeTab('dirty', false)
    store.tabs = [dirty]
    store.currentFile = dirty
    const sendSpy = vi.spyOn(window.electron.ipcRenderer, 'send')

    store.CLOSE_UNSAVED_TAB(dirty)

    expect(sendSpy).toHaveBeenCalledWith('mt::discard-and-close-tabs', [
      expect.objectContaining({ id: 'dirty', filename: 'dirty.md', markdown: 'dirty body' })
    ])
    expect(store.tabs).toEqual([dirty])
    expect(sendSpy).not.toHaveBeenCalledWith('mt::save-and-close-tabs', expect.anything())
  })

  it('Close All closes saved tabs and asks once for every dirty tab', () => {
    const store = useEditorStore()
    const saved = makeTab('saved', true)
    const dirtyA = makeTab('dirty-a', false)
    const dirtyB = makeTab('dirty-b', false)
    store.tabs = [saved, dirtyA, dirtyB]
    store.currentFile = dirtyA
    store.updateTabIdToIndex()
    const sendSpy = vi.spyOn(window.electron.ipcRenderer, 'send')

    store.CLOSE_ALL_TABS()

    expect(store.tabs.map((tab) => tab.id)).toEqual(['dirty-a', 'dirty-b'])
    const discardCalls = sendSpy.mock.calls.filter(
      ([channel]) => channel === 'mt::discard-and-close-tabs'
    )
    expect(discardCalls).toHaveLength(1)
    expect((discardCalls[0]?.[1] as Array<{ id: string }>).map(({ id }) => id)).toEqual([
      'dirty-a',
      'dirty-b'
    ])
  })

  it('sidebar Close All uses the same batched discard path', () => {
    const store = useEditorStore()
    const dirtyA = makeTab('dirty-a', false)
    const dirtyB = makeTab('dirty-b', false)
    store.tabs = [dirtyA, dirtyB]
    store.currentFile = dirtyA
    store.updateTabIdToIndex()
    const sendSpy = vi.spyOn(window.electron.ipcRenderer, 'send')

    store.ASK_FOR_SAVE_ALL(true)

    expect(sendSpy).toHaveBeenCalledTimes(1)
    expect(sendSpy).toHaveBeenCalledWith(
      'mt::discard-and-close-tabs',
      expect.arrayContaining([
        expect.objectContaining({ id: 'dirty-a' }),
        expect.objectContaining({ id: 'dirty-b' })
      ])
    )
  })

  it('Close Others preserves the selected tab and batches dirty siblings', () => {
    const store = useEditorStore()
    const saved = makeTab('saved', true)
    const keep = makeTab('keep', false)
    const dirty = makeTab('dirty', false)
    store.tabs = [saved, keep, dirty]
    store.currentFile = keep
    store.updateTabIdToIndex()
    const sendSpy = vi.spyOn(window.electron.ipcRenderer, 'send')

    store.CLOSE_OTHER_TABS(keep)

    expect(store.tabs.map((tab) => tab.id)).toEqual(['keep', 'dirty'])
    expect(sendSpy).toHaveBeenCalledWith('mt::discard-and-close-tabs', [
      expect.objectContaining({ id: 'dirty' })
    ])
  })
})
