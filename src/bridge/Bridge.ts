class Bridge {
  protected msgId: number = 0
  protected callbacks: {
    [id: number]: {
      resolve: (value: unknown) => void
      reject: (reason?: any) => void
    }
  } = {}
  protected actions: {
    [key: string]: string
  } = {}
  protected subscriber: {
    [key: string]: Function | undefined
  } = {}

  protected channel?: any

  constructor(win) {
    this.init(win)
  }
  emit(action: string, payload) {
    const id = ++this.msgId
    return new Promise((resolve, reject) => {
      this.callbacks[id] = { resolve, reject }
      this.channel!.postMessage(
        JSON.stringify({ id, evtType: action, data: payload })
      )
    })
  }
  invoke(key: string, payload) {
    if (this.actions[key]) {
      return this.emit(this.actions[key], payload)
    }
    return Promise.resolve(false)
  }
  registe(map: { [key: string]: string }) {
    Object.assign(this.actions, map)

    Object.keys(map).forEach((key) => {
      Bridge.prototype[key] = (data) => {
        // this[key] = (data) => {
        return this.invoke(key, data)
      }
    })
    return this
  }
  on(key: string, fun: Function) {
    this.subscriber[key] = fun
  }
  Off(key: string) {
    this.subscriber[key] = undefined
  }
  protected init(win) {
    this._init(win)
  }
  protected _init(win) {
    this.channel = win
    const callbacks = this.callbacks
    win.document.addEventListener('message', function (e) {
      let message

      if (typeof e.data === 'object') {
        message = e.data
      } else {
        if (typeof e.data === 'string') {
          try {
            message = JSON.parse(e.data)
          } catch (err) {
            return
          }
        }
      }
      if ('_app_' in message) {
        const cb = callbacks[message.id]
        if (cb) {
          if (message.state === 'success') {
            cb.resolve(message.data)
          } else {
            cb.reject(message.data)
          }
          delete callbacks[message.id]
        } else {
          if (message.isPush) {
            // 没必要不要用
            const sub = this.subscriber[message.name]
            if (sub) {
              sub(message.data)
            }
          }
        }
      }
    })
  }
}

export default Bridge
