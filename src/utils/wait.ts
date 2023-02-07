function wait(timespan: number): Promise<any> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, timespan)
  })
}

function countDown(seconds: number, callback: Function): Promise<any> {
  if (callback && typeof callback === 'function') {
    callback(seconds)
  }
  if (seconds) {
    return wait(1000).then((_) => {
      seconds--
      return countDown(seconds, callback)
    })
  }
  return Promise.resolve(true)
}

type TaskFun = () => Promise<any>
type ConfirmFun = (any) => boolean
/**
 *
 * @param {function} task => Promise : 任务
 * @param {function} confirm => Boolean : 确认返回值
 * @param {number} timespan : 时间间隔
 * @param {number} n : 重复次数 >= 1
 */

function loop(
  task: TaskFun,
  timespan: number = 1000,
  n: number = 1,
  confirm?: ConfirmFun
) {
  if (typeof confirm !== 'function') {
    confirm = () => false
  }
  const fun = () => {
    n--
    return task().then((ret) => {
      if (n && !confirm!(ret)) {
        return wait(timespan).then((_) => fun())
      }
      return ret
    })
  }
  return fun()
}

/**
 *
 * @param {*} fn => Promise
 * @param {*} params
 */
function createTask(fn: Function, params: any): TaskFun {
  return () => fn(params)
}

function createLoop(fn: Function, params: any) {
  const task = createTask(fn, params)
  return (timespan: number, n: number, confirm: ConfirmFun) => {
    return loop(task, timespan, n, confirm)
  }
}

/**
 * test
 */
// const fn = n => wait(n).then(_ => Math.random() * 10 >>> 0)
// const lop = createLoop(fn,1)
// const cfn = x => {
//     console.log('' + x + ' > 7 : ' + (x > 7))
//     return x > 7
// }
// lop(1000,5,cfn)


export {
  wait,
  countDown,
  createLoop
}