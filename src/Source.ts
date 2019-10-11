import { Record } from 'immutable'

import { Coordinator } from './Coordinator'

import * as Resolved from './Resolved'
import Style from './Style'

export interface Block {
  compile(coordinator: Coordinator): Resolved.Block
}

export type ParagraphKind = 'heading1' | 'heading2' | 'heading3' | 'singleQuote' | 'paragraph'

function styleFromKind(kind: ParagraphKind): Style {
  switch (kind) {
    case 'heading1':
      return new Style({ fontSize: 48 })
    case 'heading2':
      return new Style({ fontSize: 32 })
    case 'heading3':
      return new Style({ fontSize: 24 })
    case 'singleQuote':
      return new Style({ color: 'grey', fontSize: 32 })
    default:
      return new Style()
  }
}

export type ParagraphParams = {
  kind?: ParagraphKind
  text?: string
}

const ParagraphFactory = Record({ kind: 'paragraph' as ParagraphKind, text: '' })

export class Paragraph extends ParagraphFactory implements Block {
  constructor(params?: ParagraphParams) {
    params ? super(params) : super()
  }

  with(values: ParagraphParams) {
    return this.merge(values) as this
  }

  compile(_: Coordinator) {
    const style = styleFromKind(this.kind)
    return new Resolved.TextBlock({ style, text: this.text })
  }
}

export class ExternalText implements Block {
  public readonly resource: string
  constructor(resource: string) {
    this.resource = resource
  }

  compile(coordinator: Coordinator) {
    const style = new Style()
    return new Resolved.TextBlock({ style, text: coordinator.retrieve(this.resource) })
  }
}
