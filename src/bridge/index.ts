import FBridge from './FBridge'
import Bridge from './Bridge'
import actions from './actions'

const ua = navigator.userAgent.toLowerCase()

const bridge = ua.match(/lgd_f_app/) ? new FBridge(window) : new Bridge(window)

bridge.registe(actions)

export default bridge
