let _messageId: number = 0

export const newMsgId = (): number => ++_messageId

export const genUid = (): string => Math.random().toString(32).substring(2)

export function isPromise(o: any): boolean {
  return (
    !!o &&
    (typeof o === 'object' || typeof o === 'function') &&
    typeof o.then === 'function'
  )
}

export function purify(message: any): boolean {
  if (!message.data) {
    return false
  }
  if (typeof message.data !== 'object') {
    return false
  } else {
    return '_scent_' in message.data
  }
}

export function postMsg(message: any, win: Window): void {
  message['_scent_'] = true
  win.postMessage(message, '*')
}
