import React from 'react'

import ContentEditable, { InlineRange, SelectionHost } from './ContentEditable'

import { Point } from './Geometry'
import * as Source from './Source'
import { Block, TextBlock } from './Resolved'
import * as Agents from './Agents'

import Caret from './Components/Caret'
import Positioned from './Components/Positioned'
import Scrollable from './Components/Scrollable'

type CharIndex = {
  index: number
  offset: number
}

const containerSize = { height: 600, width: 600 }

const App: React.FC = () => {
  const { resolved, layout, visibleBlocks, setOffset, commit } = Agents.useDocument(Agents.sample, containerSize)
  const [caret, setCaret] = React.useState<CharIndex | null>(null)
  const elRef = React.useRef<ContentEditable>(null)

  const handleScroll = React.useCallback(
    offset => {
      setOffset(offset)
    },
    [setOffset]
  )

  const handleClick = React.useCallback(
    (client: Point, offset: Point) => {
      const blockIndex = layout.blockIndexForPoint(offset)
      if (blockIndex === -1) {
        setCaret(null)
      } else {
        const index = getCaretPosition(client)
        if (!index) {
          setCaret(null)
        } else {
          setCaret({ index: blockIndex, offset: index.offset })
        }
      }

      return true
    },
    [layout]
  )

  const rangeThunk = React.useCallback(() => {
    return inlineRangeFrom(elRef, resolved, caret)
  }, [resolved, caret])

  const handleSelectionChange = React.useCallback(
    (sel: Selection | null) => {
      if (!sel) {
        setCaret(null)
        return
      }
      if (!caret) {
        return
      }

      const offset = sel.anchorOffset
      setCaret({ index: caret.index, offset })
    },
    [caret]
  )

  const handleInsertText = React.useCallback(
    (_: InlineRange, input: string) => {
      if (!caret) {
        return
      }

      const block = resolved.source.list[caret.index] as Source.Paragraph
      const text = block.text.slice(0, caret.offset) + input + block.text.slice(caret.offset)
      const block_ = block.merge({ text })
      setCaret({ index: caret.index, offset: caret.offset + input.length })
      commit({
        kind: 'update',
        index: caret.index,
        value: block_
      })
    },
    [caret, commit, resolved.source.list]
  )

  const handleDeleteContent = React.useCallback(
    (range: InlineRange) => {
      if (!caret) {
        return
      }

      const block = resolved.source.list[caret.index] as Source.Paragraph
      const text = block.text.slice(0, range.start.offset) + block.text.slice(range.end.offset)
      const block_ = block.merge({ text })
      setCaret({ index: caret.index, offset: range.start.offset })
      commit({
        kind: 'update',
        index: caret.index,
        value: block_
      })
    },
    [caret, commit, resolved.source.list]
  )

  const noOp = React.useCallback(() => {}, [])

  const caretRect = caret && layout.caretRect(caret.index, caret.offset)

  return (
    <div>
      {<h1>{caret ? `当前的光标位置，第 ${caret.index + 1} 个段落，偏移量 ${caret.offset}。` : '未选中'}</h1>}
      <Scrollable
        containerSize={containerSize}
        contentHeight={layout.contentHeight}
        onScroll={handleScroll}
        onClick={handleClick}
      >
        {visibleBlocks.map(block => (
          <Positioned key={block.key} rect={block.rect} id={JSON.stringify(block.index)}>
            <Block block={block.block} />
          </Positioned>
        ))}
        <Caret rect={caretRect} />
      </Scrollable>{' '}
      <SelectionHost range={rangeThunk} onSelectionChange={handleSelectionChange}>
        <ContentEditable
          tag={'div'}
          props={{}}
          ref={elRef}
          onInsertText={handleInsertText}
          onDeleteContent={handleDeleteContent}
          onInsertParagraph={noOp}
        >
          {caret && <Block block={resolved.list[caret.index]} />}
        </ContentEditable>
      </SelectionHost>
    </div>
  )
}

export default App

function inlineRangeFrom(
  ref: React.RefObject<ContentEditable>,
  resolved: Agents.ResolvedTree,
  caret: CharIndex | null
) {
  if (!caret) {
    return null
  }
  const { index, offset } = caret

  if (!ref.current) {
    return null
  }
  const {
    current: { host }
  } = ref
  const { text } = resolved.list[index] as TextBlock

  if (text.length > 0) {
    return InlineRange.fromPaths(host, [0, 0], offset, [0, 0], offset)
  } else {
    return InlineRange.fromPaths(host, [0], 0, [0], 0)
  }
}

type DOMCharIndex = { node: Node; offset: number }

function getCaretPosition({ x, y }: Point): DOMCharIndex | null {
  if (document.caretPositionFromPoint) {
    const range = document.caretPositionFromPoint(x, y)
    if (!range) {
      return null
    }
    return { node: range.offsetNode, offset: range.offset }
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y)
    return { node: range.startContainer, offset: range.startOffset }
  }
  throw new Error('Your browser is not supported.')
}
