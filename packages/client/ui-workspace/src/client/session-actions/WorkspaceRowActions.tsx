/**
 * The shipped Workspace row menu entries: Rename (200) and Delete (900). Each
 * raises a request the browser-owned dialogs answer, since those dialogs must
 * outlive the row menu the entry sat in.
 */
import { IconEditOutlineRegular, IconTrashOutlineRegular, MenuItemButton } from '@deepseek-ai/dsh-client-ui-primitives'
import type { WorkspaceMenuItemProps, WorkspaceRowActionInjected } from '../contract/slots.ts'

/**
 * Menu row: open the Workspace rename dialog.
 * @param props - owner share, menu open state, and the request share.
 * @returns the row.
 */
export function RenameWorkspaceMenuItem({
  workspaceId, displayTitle, useMenuOpenState, requestWorkspaceAction, t,
}: WorkspaceMenuItemProps<WorkspaceRowActionInjected>) {
  const [, setMenuOpen] = useMenuOpenState()
  return (
    <MenuItemButton
      icon={<IconEditOutlineRegular />}
      onSelect={() => {
        setMenuOpen(false)
        requestWorkspaceAction({ kind: 'rename', workspaceId, displayTitle })
      }}
    >
      {t('rename')}
    </MenuItemButton>
  )
}

/**
 * Menu row: open the Workspace delete confirmation.
 * @param props - owner share, menu open state, and the request share.
 * @returns the row.
 */
export function DeleteWorkspaceMenuItem({
  workspaceId, displayTitle, useMenuOpenState, requestWorkspaceAction, t,
}: WorkspaceMenuItemProps<WorkspaceRowActionInjected>) {
  const [, setMenuOpen] = useMenuOpenState()
  return (
    <MenuItemButton
      danger
      icon={<IconTrashOutlineRegular />}
      onSelect={() => {
        setMenuOpen(false)
        requestWorkspaceAction({ kind: 'delete', workspaceId, displayTitle })
      }}
    >
      {t('delete.workspace')}
    </MenuItemButton>
  )
}
