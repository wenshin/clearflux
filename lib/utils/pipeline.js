let noop = () => {};

/**
 * 生成一个处理数据的 Pipeline 包装
 *
 * @param  {AnyType} value 待处理的值
 * @return {Object}        一个包含 flow 和 finish 属性的对象。 两个属性均为函数。
 *                         两个属性均接受一个函数作为，该函数接受一个数据，并返回一个新的数据
 */
export function pipelineWrap (value) {
  let _value = value;
  let _blocking = false;
  let _asyncPipeQueue = [/*{name, pipe}*/];
  let _syncPipesAfterAsync = new Map(); // { [Async, {name,pipe}] => [Sync, {name, pipe}] }
  let _handleSuccFinish = noop;
  let _handleErrFinish = noop;

  let wrapper = {
    flow(pipe, name='') {
      if ( !(pipe instanceof Function) ) {
        throw new Error('[pipelineWrap.flow] accept function only!');
      }
      if (_blocking) {
        let lastAsyncPipe = _asyncPipeQueue.slice(-1)[0];
        lastAsyncPipe && _syncPipesAfterAsync.get(lastAsyncPipe).push({name, pipe});
      } else {
        _value = pipe(_value, name);
      }

      return wrapper;
    },

    flowAsync(pipe, name='') {
      let pipeObj = {name, pipe};
      _asyncPipeQueue.push(pipeObj);
      _syncPipesAfterAsync.set(pipeObj, []);
      _blocking || _execAsyncPipe();
      return wrapper;
    },

    mapFlow() {},

    finish() {
      if (_blocking || _asyncPipeQueue.length) {
        return new Promise((resolve, reject) => {
          _handleSuccFinish = data => {
            resolve(data);
          };
          _handleErrFinish = err => {
            reject(err);
          };
        });
      } else {
        return _value;
      }
    }
  };

  function _execAsyncPipe() {
    let pipeObj = _asyncPipeQueue[0];
    let {pipe, name} = pipeObj;
    let promise = pipe(_value);
    _blocking = true;

    if (!(promise.then instanceof Function && promise.catch instanceof Function)) {
      throw new Error(`
        [pipelineWrap.flowAsync][${name}] accept a \`function(data)\`
        should return Promise instance!
      `);
    }

    promise
      .then(data => {
        _value = data;
        _blocking = false;
        for (let {pipe: syncPipe} of _syncPipesAfterAsync.get(pipeObj)) {
          _value = syncPipe(_value);
        }
        _asyncPipeQueue.shift();
        _syncPipesAfterAsync.delete(pipeObj);
        if (_asyncPipeQueue.length) {
          _execAsyncPipe();
        } else {
          _handleSuccFinish(_value);
        }
      })
      .catch(err => {
        _handleErrFinish(err);
      });
  }

  return wrapper;
}

/**
 * @Usage:
 *   ```
 *   let pipeline = new Pipeline(
 *     {
 *       name: 'pipe1',
 *       pipe: v => v,
 *       type: 'flowAsync',
 *       // pipe 运行前执行
 *       preMixins: [v => console.log(v), v => Number(v)],
 *       // pipe 运行后执行
 *       postMixins: []
 *     },
 *     {name: 'pipe2', pipe: () => {}});
 *   ```
 */
export default class Pipeline {
  static inheritProps = [
    'push', 'pop', 'shift', 'unshift', 'concat',
    'slice', 'splice', 'filter', 'map', 'reduce'
  ];

  // 所有 pipe 运行前执行
  static commonPreMinxins = [];

  // 所有 pipe 运行后执行
  static commonPostMinxins = [];

  /**
   * 添加在所有 pipe 运行之前执行的 Mixin 函数
   * @param  {Array Function|Function}  mixins  mixins是接受当前流中的数据作为参数的函数或者函数数组
   * @return {undefined}
   */
  static concatCommonPreMixins(mixins=[]) {
    Pipeline.commonPreMinxins.concat(mixins);
  }

  static concatCommonPostMixins(mixins=[]) {
    Pipeline.commonPostMinxins.concat(mixins);
  }

  constructor() {
    this._pipes = Array.from(arguments);
    let delegate = prop => this._pipes[prop].bind(this._pipes);
    for (let prop of Pipeline.inheritProps) {
      this[prop] = delegate(prop);
    }
  }

  flow(data) {
    let pipelined = pipelineWrap(data);
    pipelined = this.reduce((_pipelined, {name, pipe, type='flow'}) => {
      if (pipe && pipe instanceof Function) {
        return _pipelined[type](pipe, name);
      } else {
        throw Error(`
          new Pipeline(arg1, arg2) 的参数必须是
          {name: [String|optional], pipe: [Function], type: [String|optional]}
        `);
      }
    }, pipelined);
    return pipelined.finish();
  }
}
