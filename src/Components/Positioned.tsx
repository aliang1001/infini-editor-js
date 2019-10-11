import React from 'react'

import { cssAbsolutePositioned } from '../CSS'
import { Rect } from '../Geometry'

type Props = {
  rect: Rect
  id: string
}

const Positioned: React.FC<Props> = props => {
  const { rect, id, children } = props
  const style = cssAbsolutePositioned(rect)
  return (
    <div style={style} data-id={id}>
      {children}
    </div>
  )
}

export default Positioned
