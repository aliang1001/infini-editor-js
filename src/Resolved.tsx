import { Record } from 'immutable'
import React from 'react'

import { Rect } from './Geometry'
import Style from './Style'

import TQSServer from './TextQueryServer'

export interface Block {
  readonly baseFontSize: number

  render(): React.ReactElement
  heightGivenWidth(width: number): number
  caretRect(offset: number, width: number): Rect
}

export type TextBlockParams = {
  style?: Style
  text?: string
}

const TextBlockFactory = Record({ style: new Style(), text: '' })

export class TextBlock extends TextBlockFactory implements Block {
  constructor(params?: TextBlockParams) {
    params ? super(params) : super()
  }

  get baseFontSize() {
    return this.style.fontSize
  }

  render() {
    return <div style={this.style.css}>{this.text}</div>
  }

  heightGivenWidth(width: number) {
    const text = TQSServer.createParagraph(this.text, this.style, width)
    return text.height
  }

  caretRect(offset: number, width: number) {
    const text = TQSServer.createParagraph(this.text, this.style, width)
    return text.caretRect(offset)
  }
}

export const Block: React.FC<{ block: Block }> = ({ block }) => block.render()
