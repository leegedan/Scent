class ScentEvent {
  private _listeners: Map<string, Function>
  constructor() {
    this._listeners = new Map()
  }
  on(name: string, callback: Function): void {
    this._listeners.set(name, callback)
  }
  off(name: string): void {
    this._listeners.delete(name)
  }
  has(name: string): boolean {
    return this._listeners.has(name)
  }
  fire(name: string, payload: any) {
    if (this.has(name)) {
      const fun = this._listeners.get(name)
      return fun!(payload)
    }
  }
}

export default ScentEvent
