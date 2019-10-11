import React from 'react'

import { Rect } from './Geometry'

export function cssAbsolutePositioned(rect: Rect): React.CSSProperties {
  const { x: left, y: top } = rect.origin
  const { width, height } = rect.size

  return { position: 'absolute', top, left, height, width }
}
