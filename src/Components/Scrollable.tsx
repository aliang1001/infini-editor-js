import React from 'react'

import { Point, Size, Rect } from '../Geometry'

import Positioned from './Positioned'

type ScrollableProps = {
  containerSize: Size
  contentHeight: number

  outerClass?: string
  innerClass?: string

  onScroll?: (offset: number) => void
  onClick?: (client: Point, offset: Point) => boolean
}

const Scrollable: React.FC<ScrollableProps> = props => {
  const { containerSize, contentHeight, children } = props
  const outerEl = React.useRef<HTMLDivElement>(null)

  const { onScroll, onClick } = props

  const handleScroll = React.useCallback(
    e => {
      if (!outerEl.current || !onScroll) {
        return
      }
      const offset = outerEl.current.scrollTop
      onScroll(offset)
    },
    [onScroll]
  )

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!outerEl.current || !onClick) {
        return
      }

      const client = { x: e.clientX, y: e.clientY }
      const offset = {
        x: e.pageX - outerEl.current.offsetLeft + outerEl.current.scrollLeft,
        y: e.pageY - outerEl.current.offsetTop + outerEl.current.scrollTop
      }
      const prevent = onClick(client, offset)
      if (prevent) {
        e.preventDefault()
      }
    },
    [onClick]
  )

  const outerCSS: React.CSSProperties = {
    height: containerSize.height,
    width: containerSize.width,
    overflowY: 'scroll',
    backgroundColor: 'white'
  }

  const innerCSS: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: contentHeight
  }

  const { outerClass, innerClass } = props

  return (
    <div style={outerCSS} className={outerClass} ref={outerEl} onScroll={handleScroll}>
      <div style={innerCSS} className={innerClass} onClick={handleClick}>
        {children}
      </div>
    </div>
  )
}

export default Scrollable
