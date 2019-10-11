import { Record } from 'immutable'

export type StyleParams = {
  fontFallbackList?: string[]
  color?: string
  fontSize?: number
  lineHeight?: number
}

const StyleFactory = Record({
  fontFallbackList: ['-apple-system', 'BlinkMacSystemFont'],
  color: 'black',
  fontSize: 16,
  lineHeight: 1.5
})

export default class Style extends StyleFactory {
  constructor(params?: StyleParams) {
    params ? super(params) : super()
  }

  with(values: StyleParams) {
    return this.merge(values) as this
  }

  get css(): React.CSSProperties {
    const { color, fontSize, lineHeight } = this
    return {
      fontFamily: this.fontFallbackList.join(', '),
      color,
      fontSize,
      lineHeight,
      whiteSpace: 'pre-wrap'
    }
  }

  get cssString(): string {
    const fontFamily = this.fontFallbackList.map(x => `"${x}"`).join(', ')
    const { color, fontSize, lineHeight } = this
    return `
      font-family: ${fontFamily};
      color: ${color};
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      white-space: pre-wrap;`
  }
}
