import { describe, expect, it, vi } from 'vitest'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { WorkspaceParentMap } from '../src/client/contract/slots.ts'
import { createWorkspaceParentRegistry, resolveWorkspaceParents } from '../src/client/workspace-parents.ts'

const wid = (id: string) => id as WorkspaceId

describe('workspace parent registry', () => {
  it('merges contributors, keeps identity while unchanged, and removes a disposed contributor', () => {
    const registry = createWorkspaceParentRegistry()
    const listener = vi.fn()
    registry.merged.subscribe(listener)
    const empty = registry.merged.getSnapshot()
    expect(empty).toEqual({})

    const a = createSnapshotStore<WorkspaceParentMap>({ child: wid('main') })
    const b = createSnapshotStore<WorkspaceParentMap>({ other: wid('main'), child: wid('b-main') })
    const disposeA = registry.register(a)
    expect(registry.merged.getSnapshot()).toEqual({ child: 'main' })
    const disposeB = registry.register(b)
    // A later contributor wins on the same child.
    expect(registry.merged.getSnapshot()).toEqual({ child: 'b-main', other: 'main' })
    const snapshot = registry.merged.getSnapshot()
    expect(registry.merged.getSnapshot()).toBe(snapshot)
    const calls = listener.mock.calls.length

    a.set({ child: wid('main'), third: wid('main') })
    expect(listener.mock.calls.length).toBe(calls + 1)
    expect(registry.merged.getSnapshot()).toEqual({ child: 'b-main', other: 'main', third: 'main' })

    disposeB()
    disposeB()
    expect(registry.merged.getSnapshot()).toEqual({ child: 'main', third: 'main' })
    disposeA()
    expect(registry.merged.getSnapshot()).toEqual({})
    b.set({ ignored: wid('x') })
    expect(registry.merged.getSnapshot()).toEqual({})
  })
})

describe('resolveWorkspaceParents', () => {
  it('prefers listed logical parents and falls back to the folder parent', () => {
    const parents = resolveWorkspaceParents(
      [wid('main'), wid('wt'), wid('nested'), wid('orphan')],
      { wt: wid('main'), orphan: wid('gone') },
      id => id === 'nested' ? wid('main') : undefined,
    )
    expect(parents.get('main')).toBeUndefined()
    expect(parents.get('wt')).toBe('main')
    expect(parents.get('nested')).toBe('main')
    expect(parents.get('orphan')).toBeUndefined()
  })

  it('ignores a self edge and breaks a cycle', () => {
    const parents = resolveWorkspaceParents(
      [wid('a'), wid('b'), wid('c')],
      { a: wid('b'), b: wid('a'), c: wid('c') },
      () => undefined,
    )
    expect(parents.get('c')).toBeUndefined()
    // Exactly one edge of the a↔b cycle survives.
    expect([parents.get('a'), parents.get('b')].filter(value => value !== undefined)).toHaveLength(1)
  })
})
