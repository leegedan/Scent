let _messageId: number = 0

const newMsgId = (): number => ++_messageId

const genUid = (): string => Math.random().toString(32).substring(2)

function isPromise(o: any): boolean {
  return (
    !!o &&
    (typeof o === 'object' || typeof o === 'function') &&
    typeof o.then === 'function'
  )
}

function purify(message: any): boolean {
  if (!message.data) {
    return false
  }
  if (typeof message.data !== 'object') {
    return false
  } else {
    return '_scent_' in message.data
  }
}

function postMsg(message: any, win: Window): void {
  message['_scent_'] = true
  win.postMessage(message, '*')
}

interface ScentEventMap {
  [name: string]: Function
}
class ScentEvent {
  private _listeners: ScentEventMap
  constructor() {
    this._listeners = {}
  }
  on(name: string, callback: Function): void {
    this._listeners[name] = callback
  }
  off(name: string): void {
    delete this._listeners[name]
  }
  has(name: string): boolean {
    return typeof this._listeners[name] !== 'undefined'
  }
  fire(name: string, payload: any) {
    if (this.has(name)) {
      const fun = this._listeners[name]
      return fun(payload)
    }
  }
}

interface ScentNodeCallBack {
  [id: number]: {
    resolve: (value: unknown) => void
    reject: (reason?: any) => void
  }
}

interface IMessage {
  name: string
  msgId?: number
  sourceId?: string
  targetId?: string
  payload?: any
}

abstract class ScentNode {
  protected _id: string
  protected _events: ScentEvent
  protected _callbacks: ScentNodeCallBack

  constructor(events: ScentEvent) {
    this._id = genUid()
    this._events = events
    this._callbacks = {}
  }

  mailTo(message: IMessage) {
    const msgId = newMsgId()
    message.msgId = msgId

    return new Promise((resolve, reject) => {
      this._callbacks[msgId] = { resolve, reject }
      this.broadcast(message)
    })
  }

  trigger(msgId: number, payload: any) {
    if (this._callbacks[msgId]) {
      this._callbacks[msgId].resolve(payload)
      delete this._callbacks[msgId]
    }
  }

  reply(message: IMessage, value: any) {
    message.targetId = message.sourceId
    if (isPromise(value)) {
      // ????????????????????????????????????
      value.then((val: any) => {
        message.payload = val
        this.send(message)
      })
    } else {
      if (typeof value === 'function') {
        throw new Error(
          `scent-${this._id}: ?????????[${message.name}]???????????????????????????`
        )
      } else {
        message.payload = value
        this.send(message)
      }
    }
  }

  fire(name: string, payload: any) {
    if (this._events.has(name)) {
      return this._events.fire(name, payload)
    }
    return '__NULL__'
  }

  abstract broadcast(message: IMessage): void
  abstract receive(message: IMessage, win?: Window): void
  abstract send(message: IMessage): void
}

class Hub extends ScentNode {
  private _pigeons: Array<{ id: string; win: Window }>
  constructor(events: ScentEvent) {
    super(events)
    this._pigeons = []
  }
  /// ????????????
  push(id: string, win: Window) {
    const pigeon = this._pigeons.find((el) => el.id === id)
    if (!pigeon) {
      this._pigeons.push({ id, win })
    }
  }
  /// ??????
  sync() {
    this._pigeons = this._pigeons.filter((el) => el.win.parent !== undefined)
  }
  /// ??????
  broadcast(message: IMessage) {
    this._pigeons.forEach((el) => {
      if (message.sourceId !== el.id) {
        postMsg(message, el.win)
      }
    })
  }
  /// ????????????
  send(message: IMessage) {
    const pigeon = this._pigeons.find((el) => el.id === message.targetId)
    if (pigeon) {
      postMsg(message, pigeon.win)
    }
  }
  /// ????????????
  receive(message: IMessage, win: Window) {
    const { name, msgId, sourceId, targetId, payload } = message
    if (name === 'ready') {
      // ????????????
      this.push(sourceId!, win)
    } else {
      if (targetId) {
        if (targetId === this._id) {
          // ???????????????, ??????callback
          this.trigger(msgId!, payload)
        } else {
          // ??????????????????
          this.send(message)
        }
      } else {
        // ?????????????????????????????????????????????
        const value = this.fire(name, payload)
        if (value === '__NULL__') {
          // ?????????, ????????????
          this.broadcast(message)
        } else if (msgId && sourceId) {
          // ????????????
          this.reply(message, value)
        }
      }
    }
  }
}

class Nub extends ScentNode {
  private _pigeon: Window
  constructor(events: ScentEvent) {
    super(events)
    this._pigeon = this.getTopWin()
    this.notify()
  }
  getTopWin() {
    let win: Window = window
    while ((win = win.parent)) {
      if (win === win.parent) {
        break
      }
    }
    return win
  }
  notify() {
    this.send({ name: 'ready' })
  }
  broadcast(message: IMessage) {
    this.send(message)
  }
  send(message: IMessage) {
    message.sourceId = this._id
    postMsg(message, this._pigeon)
  }
  receive(message: IMessage) {
    const { name, msgId, sourceId, targetId, payload } = message
    // ???????????????, ??????callback
    if (targetId && targetId === this._id) {
      this.trigger(msgId!, payload)
    } else {
      // ?????????????????????????????????????????????
      const value = this.fire(name, payload)
      if (value === '__NULL__') {
        // ?????????
      } else if (msgId && sourceId) {
        // ????????????
        this.reply(message, value)
      }
    }
  }
}

class Scent {
  private static instance: Scent;

  private _events: ScentEvent
  private _cos: ScentNode

  private constructor() {
    this._events = new ScentEvent()

    const win = window
    if (win === win.parent) {
      this._cos = new Hub(this._events)
    } else {
      this._cos = new Nub(this._events)
    }

    win.addEventListener('message', (e) => {
      if (purify(e)) {
        this._cos.receive(e.data, e.source as Window)
      }
    })
  }

  public static getInstance() {
    if (!Scent.instance) {
      Scent.instance = new Scent();
    }

    return Scent.instance;
  }

  emit(name: string, payload: any) {
    return this._cos.broadcast({
      name,
      payload,
    })
  }
  call(name: string, payload: any) {
    return this._cos.mailTo({
      name,
      payload,
    })
  }
  on(name: string, callback: Function) {
    this._events.on(name, callback)
    return this
  }
  off(name: string) {
    this._events.off(name)
    return this
  }
}

// export Scent
