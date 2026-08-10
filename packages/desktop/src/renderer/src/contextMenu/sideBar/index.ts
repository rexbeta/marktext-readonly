import {
  SEPARATOR,
  getNewFile,
  getNewDirectory,
  getCOPY,
  getCUT,
  getPASTE,
  getRENAME,
  getDELETE,
  getShowInFolder
} from './menuItems'
import { popupContextMenu, type ContextMenuItem } from '../popupMenu'

export const showContextMenu = (
  event: { clientX: number; clientY: number },
  hasPathCache: boolean,
  editMode = true
): void => {
  const contextItems: ContextMenuItem[] = [
    getNewFile(),
    getNewDirectory(),
    SEPARATOR,
    getCOPY(),
    getCUT(),
    getPASTE(),
    SEPARATOR,
    getRENAME(),
    getDELETE(),
    SEPARATOR,
    getShowInFolder()
  ]

  // Copy/show-in-folder are read-only operations. Every filesystem mutation is
  // disabled in viewer mode; the project store repeats the guard as defence in
  // depth for keyboard/programmatic events.
  for (const index of [0, 1, 4, 5, 7, 8]) contextItems[index].enabled = editMode
  contextItems[5].enabled = editMode && hasPathCache

  const items: ContextMenuItem[] = contextItems.map((item) => {
    if (!item || item.type === 'separator') return item
    const click = item.click
    return {
      ...item,
      click: click ? () => click(null, null) : undefined
    }
  })

  popupContextMenu(items, { x: event.clientX, y: event.clientY })
}
