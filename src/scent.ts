import { newMsgId, genUid, isPromise, purify, postMsg } from './util'
import ScentEvent from './event'

type ICallbacks = Map<
  number,
  { resolve: (value: unknown) => void; reject: (reason?: any) => void }
>

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
  protected _callbacks: ICallbacks

  constructor(events: ScentEvent) {
    this._id = genUid()
    this._events = events
    this._callbacks = new Map()
  }

  mailTo(message: IMessage) {
    const msgId = newMsgId()
    message.msgId = msgId

    return new Promise((resolve, reject) => {
      this._callbacks.set(msgId, { resolve, reject })
      this.broadcast(message)
    })
  }

  trigger(msgId: number, payload: any) {
    if (this._callbacks.has(msgId)) {
      this._callbacks.get(msgId)?.resolve(payload)
      this._callbacks.delete(msgId)
    }
  }

  reply(message: IMessage, value: any) {
    message.targetId = message.sourceId
    if (isPromise(value)) {
      // 这个处理好像没有太多必要
      value.then((val: any) => {
        message.payload = val
        this.send(message)
      })
    } else {
      if (typeof value === 'function') {
        throw new Error(
          `scent-${this._id}: 不允许[${message.name}]事件返回函数类型值`
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
  /// 添加节点
  push(id: string, win: Window) {
    const pigeon = this._pigeons.find((el) => el.id === id)
    if (!pigeon) {
      this._pigeons.push({ id, win })
    }
  }
  /// 同步
  sync() {
    this._pigeons = this._pigeons.filter((el) => el.win.parent !== undefined)
  }
  /// 广播
  broadcast(message: IMessage) {
    this._pigeons.forEach((el) => {
      if (message.sourceId !== el.id) {
        postMsg(message, el.win)
      }
    })
  }
  /// 转发消息
  send(message: IMessage) {
    const pigeon = this._pigeons.find((el) => el.id === message.targetId)
    if (pigeon) {
      postMsg(message, pigeon.win)
    }
  }
  /// 接收消息
  receive(message: IMessage, win: Window) {
    const { name, msgId, sourceId, targetId, payload } = message
    if (name === 'ready') {
      // 添加节点
      this.push(sourceId!, win)
    } else {
      if (targetId) {
        if (targetId === this._id) {
          // 接收到应答, 调用callback
          this.trigger(msgId!, payload)
        } else {
          // 转发应答消息
          this.send(message)
        }
      } else {
        // 接收到广播，检查是否订阅此事件
        const value = this.fire(name, payload)
        if (value === '__NULL__') {
          // 未订阅, 向下广播
          this.broadcast(message)
        } else if (msgId && sourceId) {
          // 回复消息
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
    // 接收到应答, 调用callback
    if (targetId && targetId === this._id) {
      this.trigger(msgId!, payload)
    } else {
      // 接收到广播，检查是否订阅此事件
      const value = this.fire(name, payload)
      if (value === '__NULL__') {
        // 未订阅
      } else if (msgId && sourceId) {
        // 回复消息
        this.reply(message, value)
      }
    }
  }
}

class Scent {
  private _events: ScentEvent
  private _cos: ScentNode
  constructor() {
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

export default Scent
