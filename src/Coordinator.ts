type Resource = string

export interface ResourceObserver {
  resourceChanged(ids: string[]): void
}

export interface Coordinator {
  retrieve(id: string): Resource
  observe(observer: ResourceObserver): void
  unobserve(observer: ResourceObserver): void
}

export class FakeCoordinator implements Coordinator {
  counter: number = 0
  observers: ResourceObserver[] = []

  get everyOne(): number {
    return this.counter
  }

  get everyTwo(): number {
    return Math.floor(this.counter / 2)
  }

  get everyFour(): number {
    return Math.floor(this.counter / 4)
  }

  retrieve(id: string) {
    if (id === 'everyOne') {
      return `counter = ${this.everyOne}; update every second`
    }

    if (id === 'everyTwo') {
      return `counter = ${this.everyTwo}; update every two seconds`
    }

    if (id === 'everyFour') {
      return `counter = ${this.everyFour}; update every four seconds`
    }

    return 'resource not found'
  }

  constructor() {
    setInterval(() => {
      this.counter += 1

      let changed: string[] = ['everyOne']
      if (this.counter % 2 === 0) {
        changed.push('everyTwo')
      }
      if (this.counter % 4 === 0) {
        changed.push('everyFour')
      }
      for (const observer of this.observers) {
        observer.resourceChanged(changed)
      }
    }, 1000)
  }

  observe(observer: ResourceObserver) {
    this.observers.push(observer)
  }

  unobserve(observer: ResourceObserver) {
    const index = this.observers.indexOf(observer)
    if (index !== -1) {
      this.observers = [...this.observers.slice(0, index), ...this.observers.slice(index + 1)]
    }
  }
}
