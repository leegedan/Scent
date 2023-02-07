import Bridge from './Bridge'
const APP_WEBVIEW_JS_CHANNEL = 'VOICE'
const RECEIVE_APP_MESSAGE = 'onAppVoice'

class FBridge extends Bridge {
  constructor(win) {
    super(win)
  }
  
  _init(win) {
    this.channel = win[APP_WEBVIEW_JS_CHANNEL]

    const callbacks = this.callbacks
    win[RECEIVE_APP_MESSAGE] = function (message) {
      if (message.id) {
        const cb = callbacks[message.id]
        if (cb) {
          if (message.state === 'success') {
            cb.resolve(message.data)
          } else {
            cb.reject(message.data)
          }
        }
      } else {
        if (message.isPush) {
          const sub = this.subscriber[message.name]
          if (sub) {
            sub(message.data)
          }
        }
      }
    }
  }
}

export default FBridge
