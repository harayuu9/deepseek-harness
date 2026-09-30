/**
 * Logical Workspace parents: contributors register an observable map from a
 * child Workspace id to its parent Workspace id, and the browser nests the
 * child row under that parent regardless of where either directory lives.
 * The merged map is one observable whose snapshot keeps its identity until a
 * contributor publishes a different map or a contributor joins or leaves.
 */
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { WorkspaceParentMap } from './contract/slots.ts'

/** Merged parent source plus the registration entry point. */
export interface WorkspaceParentRegistry {
  /** Merged child → parent map; later registrations win on a conflicting child. */
  readonly merged: HostObservable<WorkspaceParentMap>
  /**
   * Add one contributor's map.
   * @param source - observable child → parent map owned by the contributor.
   * @returns idempotent disposer removing this contributor.
   */
  register(source: HostObservable<WorkspaceParentMap>): () => void
}

const EMPTY: WorkspaceParentMap = Object.freeze({})

/**
 * Create the registry the browser reads and `uiWorkspace` exposes.
 * @returns the registry.
 */
export function createWorkspaceParentRegistry(): WorkspaceParentRegistry {
  const contributors: HostObservable<WorkspaceParentMap>[] = []
  const unsubscribe = new Map<HostObservable<WorkspaceParentMap>, () => void>()
  const listeners = new Set<() => void>()
  let snapshot: WorkspaceParentMap = EMPTY
  let seen: readonly WorkspaceParentMap[] = []

  const recompute = (): void => {
    const current = contributors.map(source => source.getSnapshot())
    if (current.length === seen.length && current.every((map, index) => map === seen[index])) return
    seen = current
    const next: Record<string, WorkspaceParentMap[string]> = {}
    for (const map of current) Object.assign(next, map)
    snapshot = Object.keys(next).length === 0 ? EMPTY : Object.freeze(next)
    for (const listener of [...listeners]) listener()
  }

  return {
    merged: {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
    },
    register: (source) => {
      contributors.push(source)
      unsubscribe.set(source, source.subscribe(recompute))
      recompute()
      let disposed = false
      return () => {
        if (disposed) return
        disposed = true
        const index = contributors.indexOf(source)
        if (index !== -1) contributors.splice(index, 1)
        unsubscribe.get(source)?.()
        unsubscribe.delete(source)
        recompute()
      }
    },
  }
}

/**
 * Resolve each Workspace's rendered parent: a registered logical parent that
 * is itself listed and would not form a cycle, otherwise the directory
 * ancestor the tree view derives.
 * @param workspaceIds - listed Workspace ids.
 * @param logical - merged logical parents.
 * @param folderParent - directory-ancestry parent per Workspace (tree view only).
 * @returns rendered parent per listed Workspace id.
 */
export function resolveWorkspaceParents(
  workspaceIds: readonly WorkspaceId[],
  logical: WorkspaceParentMap,
  folderParent: (workspaceId: WorkspaceId) => WorkspaceId | undefined,
): Map<string, WorkspaceId | undefined> {
  const listed = new Set<string>(workspaceIds)
  const parents = new Map<string, WorkspaceId | undefined>()
  for (const id of workspaceIds) {
    const explicit = logical[id]
    parents.set(id, explicit !== undefined && explicit !== id && listed.has(explicit) ? explicit : folderParent(id))
  }
  // Break each cycle at the first member visited: a walk that returns to its
  // start drops that start's edge; a walk entering a cycle elsewhere stops.
  for (const id of workspaceIds) {
    const visited = new Set<string>([id])
    for (let key: string | undefined = parents.get(id); key !== undefined; key = parents.get(key)) {
      if (key === id) {
        parents.set(id, undefined)
        break
      }
      if (visited.has(key)) break
      visited.add(key)
    }
  }
  return parents
}
