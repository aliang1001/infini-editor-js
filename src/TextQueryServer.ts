import React from 'react'

import Style from './Style'
import { Rect } from './Geometry'

export interface QueryableText {
  readonly text: string
  readonly style: Style
  readonly width: number
  readonly height: number
  caretRect(offset: number): Rect
}

class Text implements QueryableText {
  readonly text: string
  readonly style: Style
  readonly width: number

  constructor(text: string, style: Style, width: number) {
    this.text = text
    this.style = style
    this.width = width
  }

  private createDiv(innerHTML: string): HTMLElement {
    const div = document.createElement('div')
    div.innerHTML = innerHTML

    const style = `
        ${this.style.cssString}
        width: ${this.width}px;
        position: absolute;
        top: -99999px;
        visibility: none;`
    div.setAttribute('style', style)
    return div
  }

  get height() {
    const div = this.createDiv(this.text)
    document.body.appendChild(div)
    const height = div.clientHeight
    document.body.removeChild(div)
    return height
  }

  caretRect(offset: number) {
    const first = this.text.slice(0, offset)
    const second = this.text.slice(offset)
    const div = this.createDiv(`<span>${first}</span><span>${second}</span>`)
    document.body.appendChild(div)
    const secondSpan = div.children[1] as HTMLElement
    const x = secondSpan.offsetLeft
    const y = secondSpan.offsetTop
    document.body.removeChild(div)

    const width = 2
    const height = this.style.fontSize * 1.2
    return {
      origin: { x, y },
      size: { width, height }
    }
  }
}

export class TextQueryServer {
  createParagraph(text: string, style: Style, width: number): QueryableText {
    return new Text(text, style, width)
  }
}

const server = new TextQueryServer()

export default server
