declare let _messageId: number;
declare const newMsgId: () => number;
declare const genUid: () => string;
declare function isPromise(o: any): boolean;
declare function purify(message: any): boolean;
declare function postMsg(message: any, win: Window): void;
interface ScentEventMap {
    [name: string]: Function;
}
declare class ScentEvent {
    private _listeners;
    constructor();
    on(name: string, callback: Function): void;
    off(name: string): void;
    has(name: string): boolean;
    fire(name: string, payload: any): any;
}
interface ScentNodeCallBack {
    [id: number]: {
        resolve: (value: unknown) => void;
        reject: (reason?: any) => void;
    };
}
interface IMessage {
    name: string;
    msgId?: number;
    sourceId?: string;
    targetId?: string;
    payload?: any;
}
declare abstract class ScentNode {
    protected _id: string;
    protected _events: ScentEvent;
    protected _callbacks: ScentNodeCallBack;
    constructor(events: ScentEvent);
    mailTo(message: IMessage): Promise<unknown>;
    trigger(msgId: number, payload: any): void;
    reply(message: IMessage, value: any): void;
    fire(name: string, payload: any): any;
    abstract broadcast(message: IMessage): void;
    abstract receive(message: IMessage, win?: Window): void;
    abstract send(message: IMessage): void;
}
declare class Hub extends ScentNode {
    private _pigeons;
    constructor(events: ScentEvent);
    push(id: string, win: Window): void;
    sync(): void;
    broadcast(message: IMessage): void;
    send(message: IMessage): void;
    receive(message: IMessage, win: Window): void;
}
declare class Nub extends ScentNode {
    private _pigeon;
    constructor(events: ScentEvent);
    getTopWin(): Window;
    notify(): void;
    broadcast(message: IMessage): void;
    send(message: IMessage): void;
    receive(message: IMessage): void;
}
declare class Scent {
    private static instance;
    private _events;
    private _cos;
    private constructor();
    static getInstance(): Scent;
    emit(name: string, payload: any): void;
    call(name: string, payload: any): Promise<unknown>;
    on(name: string, callback: Function): this;
    off(name: string): this;
}
