"use strict";
let _messageId = 0;
const newMsgId = () => ++_messageId;
const genUid = () => Math.random().toString(32).substring(2);
function isPromise(o) {
    return (!!o &&
        (typeof o === 'object' || typeof o === 'function') &&
        typeof o.then === 'function');
}
function purify(message) {
    if (!message.data) {
        return false;
    }
    if (typeof message.data !== 'object') {
        return false;
    }
    else {
        return '_scent_' in message.data;
    }
}
function postMsg(message, win) {
    message['_scent_'] = true;
    win.postMessage(message, '*');
}
class ScentEvent {
    constructor() {
        this._listeners = {};
    }
    on(name, callback) {
        this._listeners[name] = callback;
    }
    off(name) {
        delete this._listeners[name];
    }
    has(name) {
        return typeof this._listeners[name] !== 'undefined';
    }
    fire(name, payload) {
        if (this.has(name)) {
            const fun = this._listeners[name];
            return fun(payload);
        }
    }
}
class ScentNode {
    constructor(events) {
        this._id = genUid();
        this._events = events;
        this._callbacks = {};
    }
    mailTo(message) {
        const msgId = newMsgId();
        message.msgId = msgId;
        return new Promise((resolve, reject) => {
            this._callbacks[msgId] = { resolve, reject };
            this.broadcast(message);
        });
    }
    trigger(msgId, payload) {
        if (this._callbacks[msgId]) {
            this._callbacks[msgId].resolve(payload);
            delete this._callbacks[msgId];
        }
    }
    reply(message, value) {
        message.targetId = message.sourceId;
        if (isPromise(value)) {
            // 这个处理好像没有太多必要
            value.then((val) => {
                message.payload = val;
                this.send(message);
            });
        }
        else {
            if (typeof value === 'function') {
                throw new Error(`scent-${this._id}: 不允许[${message.name}]事件返回函数类型值`);
            }
            else {
                message.payload = value;
                this.send(message);
            }
        }
    }
    fire(name, payload) {
        if (this._events.has(name)) {
            return this._events.fire(name, payload);
        }
        return '__NULL__';
    }
}
class Hub extends ScentNode {
    constructor(events) {
        super(events);
        this._pigeons = [];
    }
    /// 添加节点
    push(id, win) {
        const pigeon = this._pigeons.find((el) => el.id === id);
        if (!pigeon) {
            this._pigeons.push({ id, win });
        }
    }
    /// 同步
    sync() {
        this._pigeons = this._pigeons.filter((el) => el.win.parent !== undefined);
    }
    /// 广播
    broadcast(message) {
        this._pigeons.forEach((el) => {
            if (message.sourceId !== el.id) {
                postMsg(message, el.win);
            }
        });
    }
    /// 转发消息
    send(message) {
        const pigeon = this._pigeons.find((el) => el.id === message.targetId);
        if (pigeon) {
            postMsg(message, pigeon.win);
        }
    }
    /// 接收消息
    receive(message, win) {
        const { name, msgId, sourceId, targetId, payload } = message;
        if (name === 'ready') {
            // 添加节点
            this.push(sourceId, win);
        }
        else {
            if (targetId) {
                if (targetId === this._id) {
                    // 接收到应答, 调用callback
                    this.trigger(msgId, payload);
                }
                else {
                    // 转发应答消息
                    this.send(message);
                }
            }
            else {
                // 接收到广播，检查是否订阅此事件
                const value = this.fire(name, payload);
                if (value === '__NULL__') {
                    // 未订阅, 向下广播
                    this.broadcast(message);
                }
                else if (msgId && sourceId) {
                    // 回复消息
                    this.reply(message, value);
                }
            }
        }
    }
}
class Nub extends ScentNode {
    constructor(events) {
        super(events);
        this._pigeon = this.getTopWin();
        this.notify();
    }
    getTopWin() {
        let win = window;
        while ((win = win.parent)) {
            if (win === win.parent) {
                break;
            }
        }
        return win;
    }
    notify() {
        this.send({ name: 'ready' });
    }
    broadcast(message) {
        this.send(message);
    }
    send(message) {
        message.sourceId = this._id;
        postMsg(message, this._pigeon);
    }
    receive(message) {
        const { name, msgId, sourceId, targetId, payload } = message;
        // 接收到应答, 调用callback
        if (targetId && targetId === this._id) {
            this.trigger(msgId, payload);
        }
        else {
            // 接收到广播，检查是否订阅此事件
            const value = this.fire(name, payload);
            if (value === '__NULL__') {
                // 未订阅
            }
            else if (msgId && sourceId) {
                // 回复消息
                this.reply(message, value);
            }
        }
    }
}
class Scent {
    constructor() {
        this._events = new ScentEvent();
        const win = window;
        if (win === win.parent) {
            this._cos = new Hub(this._events);
        }
        else {
            this._cos = new Nub(this._events);
        }
        win.addEventListener('message', (e) => {
            if (purify(e)) {
                this._cos.receive(e.data, e.source);
            }
        });
    }
    static getInstance() {
        if (!Scent.instance) {
            Scent.instance = new Scent();
        }
        return Scent.instance;
    }
    emit(name, payload) {
        return this._cos.broadcast({
            name,
            payload,
        });
    }
    call(name, payload) {
        return this._cos.mailTo({
            name,
            payload,
        });
    }
    on(name, callback) {
        this._events.on(name, callback);
        return this;
    }
    off(name) {
        this._events.off(name);
        return this;
    }
}
// export Scent
