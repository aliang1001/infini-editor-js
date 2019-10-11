export type Insertion<Ix, T> = {
  kind: 'insertion'
  index: Ix
  value: T
}

export type Deletion<Ix, T> = {
  kind: 'deletion'
  index: Ix
}

export type Update<Ix, T> = {
  kind: 'update'
  index: Ix
  value: T
}

export type Sequential<Ix, T> = {
  kind: 'sequential'
  group: Array<Mutation<Ix, T>>
}

export type Mutation<Ix, T> = Insertion<Ix, T> | Deletion<Ix, T> | Update<Ix, T> | Sequential<Ix, T>

export function map<Ix, S, T>(f: (x: S) => T, mutation: Mutation<Ix, S>): Mutation<Ix, T> {
  switch (mutation.kind) {
    case 'insertion': {
      const { index, value } = mutation
      return {
        kind: 'insertion',
        index,
        value: f(value)
      }
    }

    case 'deletion': {
      const { index } = mutation
      return {
        kind: 'deletion',
        index
      }
    }

    case 'update': {
      const { index, value } = mutation
      return {
        kind: 'update',
        index,
        value: f(value)
      }
    }

    case 'sequential': {
      const { group } = mutation
      return {
        kind: 'sequential',
        group: group.map(x => map(f, x))
      }
    }
  }
}

export function applyToArray<T>(array: T[], mutation: Mutation<number, T>): T[] {
  switch (mutation.kind) {
    case 'insertion': {
      const { index, value } = mutation
      return [...array.slice(0, index), value, ...array.slice(index)]
    }

    case 'deletion': {
      const { index } = mutation
      return [...array.slice(0, index), ...array.slice(index + 1)]
    }

    case 'update': {
      const { index, value } = mutation
      array = array.slice(0)
      array[index] = value
      return array
    }

    case 'sequential': {
      const { group } = mutation
      for (const mutation of group) {
        array = applyToArray(array, mutation)
      }
      return array
    }
  }
}
