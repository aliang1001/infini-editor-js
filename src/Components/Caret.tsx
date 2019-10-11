import React from 'react'
import './Caret.css'

import { cssAbsolutePositioned } from '../CSS'
import { Rect } from '../Geometry'

type Props = { rect: Rect | null }

const Caret: React.FC<Props> = ({ rect }) => {
  if (!rect) {
    return <div style={{ display: 'none' }}></div>
  }

  const style = cssAbsolutePositioned(rect)
  return <div className={'caret-blink'} style={style}></div>
}

export default Caret
