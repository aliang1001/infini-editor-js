import React from 'react'

import * as Coordinator from './Coordinator'

import * as Source from './Source'
import * as Resolved from './Resolved'

import { Point, Size, Rect } from './Geometry'
import * as Geometry from './Geometry'

import * as Mutation from './Mutation'

export type SourceMutation = Mutation.Mutation<number, Source.Block>

export interface SourceTreeObserver {
  sourceTreeMutationReceived(mutation: SourceMutation): void
}

export class SourceTree {
  public list: Source.Block[]
  private observers: SourceTreeObserver[] = []

  constructor(list: Source.Block[]) {
    this.list = list
  }

  apply(mutation: SourceMutation) {
    this.list = Mutation.applyToArray(this.list, mutation)
    for (const observer of this.observers) {
      observer.sourceTreeMutationReceived(mutation)
    }
  }

  observe(observer: SourceTreeObserver) {
    this.observers.push(observer)
  }

  unobserve(observer: SourceTreeObserver) {
    const index = this.observers.indexOf(observer)
    if (index !== -1) {
      this.observers = [...this.observers.slice(0, index), ...this.observers.slice(index + 1)]
    }
  }
}

export type ResolvedMutation = Mutation.Mutation<number, Resolved.Block>

export interface ResolvedTreeObserver {
  resolvedTreeMutationReceived(mutation: ResolvedMutation): void
}

export class ResolvedTree implements SourceTreeObserver, Coordinator.ResourceObserver {
  public source: SourceTree
  public coordinator: Coordinator.Coordinator
  public list: Resolved.Block[]
  private observers: ResolvedTreeObserver[] = []

  constructor(source: SourceTree, coordinator: Coordinator.Coordinator) {
    this.source = source
    this.source.observe(this)
    this.coordinator = coordinator
    this.coordinator.observe(this)
    this.list = source.list.map(x => x.compile(this.coordinator))
  }

  sourceTreeMutationReceived(sourceMutation: SourceMutation) {
    const mutation: ResolvedMutation = Mutation.map(x => x.compile(this.coordinator), sourceMutation)
    this.list = Mutation.applyToArray(this.list, mutation)
    for (const observer of this.observers) {
      observer.resolvedTreeMutationReceived(mutation)
    }
  }

  observe(observer: ResolvedTreeObserver) {
    this.observers.push(observer)
  }

  unobserve(observer: ResolvedTreeObserver) {
    const index = this.observers.indexOf(observer)
    if (index !== -1) {
      this.observers = [...this.observers.slice(0, index), ...this.observers.slice(index + 1)]
    }
  }

  resourceChanged(ids: string[]) {
    let mutated: number[] = []

    for (const [i, block] of this.source.list.entries()) {
      if (block instanceof Source.ExternalText) {
        if (ids.indexOf(block.resource) !== -1) {
          mutated.push(i)
        }
      }
    }

    const mutations = mutated.map(i => {
      const block = this.source.list[i]
      const resolved = block.compile(this.coordinator)
      const mutation: ResolvedMutation = {
        kind: 'update',
        index: i,
        value: resolved
      }
      return mutation
    })
    const mutation: ResolvedMutation = {
      kind: 'sequential',
      group: mutations
    }
    this.list = Mutation.applyToArray(this.list, mutation)
    for (const observer of this.observers) {
      observer.resolvedTreeMutationReceived(mutation)
    }
  }
}

export type LayoutConfig = {
  padding: { top: number; bottom: number; left: number; right: number }
  spacingBetweenBlock: number
}

const defaultConfig: LayoutConfig = {
  padding: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20
  },
  spacingBetweenBlock: 20
}

interface LayoutTreeObserver {
  layoutUpdated(): void
}

export class LayoutTree implements ResolvedTreeObserver {
  public resolved: ResolvedTree
  public containerWidth: number
  public layoutConfig: LayoutConfig

  private heights: number[]
  // 由 fixRects 初始化。
  public rects: Rect[] = []
  public contentHeight: number = 0

  get contentWidth(): number {
    const { left, right } = this.layoutConfig.padding
    return this.containerWidth - left - right
  }

  private observers: LayoutTreeObserver[] = []

  constructor(resolved: ResolvedTree, containerWidth: number, layoutConfig: LayoutConfig = defaultConfig) {
    this.resolved = resolved
    this.resolved.observe(this)
    this.containerWidth = containerWidth
    this.layoutConfig = layoutConfig

    this.heights = resolved.list.map(x => x.heightGivenWidth(this.contentWidth))
    this.fixRects()
  }

  observe(observer: LayoutTreeObserver) {
    this.observers.push(observer)
  }

  unobserve(observer: LayoutTreeObserver) {
    const index = this.observers.indexOf(observer)
    if (index !== -1) {
      this.observers = [...this.observers.slice(0, index), ...this.observers.slice(index + 1)]
    }
  }

  fixRects() {
    const contentWidth = this.contentWidth
    const { padding, spacingBetweenBlock } = this.layoutConfig

    let rects: Rect[] = []
    let y = padding.top
    for (const height of this.heights) {
      const rect = {
        origin: { x: padding.left, y },
        size: { width: contentWidth, height }
      }
      y += height + spacingBetweenBlock
      rects.push(rect)
    }
    this.rects = rects
    this.contentHeight = y - spacingBetweenBlock + padding.bottom
  }

  resolvedTreeMutationReceived(resolvedMutation: ResolvedMutation) {
    const mutation = Mutation.map(x => x.heightGivenWidth(this.contentWidth), resolvedMutation)
    this.heights = Mutation.applyToArray(this.heights, mutation)
    this.fixRects()
    for (const observer of this.observers) {
      observer.layoutUpdated()
    }
  }

  blockIndexForPoint(point: Point) {
    for (let i = 0; i < this.rects.length; i += 1) {
      const rect = this.rects[i]
      if (Geometry.inRect(point, rect)) {
        return i
      }
    }
    return -1
  }

  caretRect(index: number, offset: number): Rect {
    const origin = this.rects[index].origin
    const { origin: relative, size } = this.resolved.list[index].caretRect(offset, this.contentWidth)
    return {
      origin: {
        x: origin.x + relative.x,
        y: origin.y + relative.y
      },
      size
    }
  }
}

type VisibleBlock = {
  index: number
  key: number
  rect: Rect
  block: Resolved.Block
}

type SetVisibleBlocks = (blocks: VisibleBlock[]) => void

// 将当前可见的段落/区块呈现出来。
export class RenderTree implements LayoutTreeObserver {
  public layout: LayoutTree
  public containerHeight: number
  public offset: number

  private allocator: KeyAllocator

  private get visibleBlockIndices(): number[] {
    const rects = this.layout.rects

    const firstVisible: number = (() => {
      for (let i = 0; i < rects.length; i += 1) {
        const rect = rects[i]
        if (rect.origin.y + rect.size.height >= this.offset) {
          return i
        }
      }
      return rects.length
    })()

    const lastVisible: number = (() => {
      for (let i = rects.length - 1; i >= 0; i -= 1) {
        const rect = rects[i]
        if (rect.origin.y <= this.offset + this.containerHeight) {
          return i
        }
      }
      return -1
    })()

    let indices: number[] = []
    for (let i = firstVisible; i <= lastVisible; i += 1) {
      indices.push(i)
    }
    return indices
  }

  public visibleBlocks: VisibleBlock[]
  public setVisibleBlocks?: SetVisibleBlocks = undefined

  constructor(layout: LayoutTree, containerHeight: number, offset: number = 0) {
    this.layout = layout
    this.layout.observe(this)
    this.containerHeight = containerHeight
    this.offset = 0
    this.allocator = new KeyAllocator()

    this.visibleBlocks = this.visibleBlockIndices.map(index => {
      const key = this.allocator.requestKey()
      const rect = this.layout.rects[index]
      const block = this.layout.resolved.list[index]
      return { key, index, rect, block }
    })
  }

  private fixVisibleBlocks() {
    const indicies = this.visibleBlockIndices

    for (const { index, key } of this.visibleBlocks) {
      if (indicies.indexOf(index) === -1) {
        this.allocator.recycleKey(key)
      }
    }

    this.visibleBlocks = indicies.map(index => {
      const visible = this.visibleBlocks.find(x => x.index === index)
      const key = visible ? visible.key : this.allocator.requestKey()
      const rect = this.layout.rects[index]
      const block = this.layout.resolved.list[index]
      return { key, index, rect, block }
    })

    this.setVisibleBlocks && this.setVisibleBlocks(this.visibleBlocks)
  }

  scrollTo(offset: number) {
    this.offset = offset
    this.fixVisibleBlocks()
  }

  layoutUpdated() {
    // 以防我们删除了最后一行
    this.offset = Math.min(this.offset, this.layout.contentHeight - this.containerHeight)
    this.fixVisibleBlocks()
  }
}

export function useDocument(list: Source.Block[], containerSize: Size) {
  const [source, resolved, layout, render] = React.useMemo(() => {
    const coordinator = new Coordinator.FakeCoordinator()
    const source = new SourceTree(list)
    const resolved = new ResolvedTree(source, coordinator)
    const layout = new LayoutTree(resolved, containerSize.width)
    const render = new RenderTree(layout, containerSize.height)
    return [source, resolved, layout, render]
  }, [list, containerSize])

  const [visibleBlocks, setVisibleBlocks] = React.useState(render.visibleBlocks)
  if (!render.setVisibleBlocks) {
    render.setVisibleBlocks = setVisibleBlocks
  }

  const setOffset = React.useCallback(
    offset => {
      render.scrollTo(offset)
    },
    [render]
  )

  const commit = React.useCallback(
    (mutation: SourceMutation) => {
      source.apply(mutation)
    },
    // eslint-disable-next-line
    [source, render]
  )

  return {
    source,
    resolved,
    layout,
    render,
    visibleBlocks,
    setOffset,
    commit
  }
}

class KeyAllocator {
  used: number[] = []
  total: number = 0

  requestKey(): number {
    const { used, total } = this
    if (used.length === total) {
      const key = total
      this.used.push(key)
      this.total += 1
      return key
    }

    let key = 0
    for (let i = 0; i < used.length; i += 1) {
      if (used[i] !== key) {
        this.used = [...used.slice(0, i), key, ...used.slice(i)]
        return key
      }
      key += 1
    }
    if (key < total) {
      this.used.push(key)
      return key
    }

    throw new Error('Logic error. Should have found a key by now.')
  }

  recycleKey(key: number) {
    const { used } = this
    const i = used.indexOf(key)
    if (i === -1) {
      return
    }

    this.used = [...used.slice(0, i), ...used.slice(i + 1)]
  }
}

function seqN(n: number): number[] {
  let array: number[] = []
  for (let i = 1; i <= n; i += 1) {
    array.push(i)
  }
  return array
}

const quoteList: string[] = [
  'Hello there!',
  'Sith Lords are our specialty!',
  'It’s over Anakin! I have the high ground!',
  'That’s why I’m here.',
  'In my experience, there’s no such thing as luck.',
  'Why do I feel you’re going to be the death of me?',
  'Wait a minute. How did this happen? we’re smarter than this.',
  'I hate it when he does that.',
  'Only a Sith deals in absolutes. I will do what I must.',
  'Who’s more foolish: the fool or the fool who follows him?',
  'If you strike me down I will become more powerful than you could possibly imagine.',
  'So what I told you was true, from a certain point of view.',
  'Oh I have a bad feeling about this.',
  'My allegiance is to the republic, to democracy!',
  'I am the SENATE. Not yet. It’s treason then.',
  'A surprise, to be sure, but a welcome one.',
  'I’ve been waiting a long time for this moment. Wipe them out, All of them.',
  'Did you ever hear the tragedy of Darth Plagueis the Wise? I thought not, it is not a story the Jedi would tell you. It is a Sith Legend.',
  'If one is to understand the great mystery, one must study all its aspects, not just the narrow dogmatic narrow view of the Jedi.'
]

const kindList: Source.ParagraphKind[] = ['heading1', 'heading2', 'heading3', 'singleQuote', 'paragraph']

export const sample_ = seqN(100).map(_ => {
  const kind = kindList[Math.floor(Math.random() * kindList.length)]
  const text = quoteList[Math.floor(Math.random() * quoteList.length)]
  return new Source.Paragraph({ kind, text })
})

export const sample = [
  new Source.ExternalText('everyOne'),
  new Source.ExternalText('everyTwo'),
  new Source.ExternalText('everyFour'),
  ...sample_
]
