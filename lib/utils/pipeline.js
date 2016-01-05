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
  let _pipeCount = 0;
  let _blocking = false;
  let _asyncPipeQueue = [/*{name, pipe}*/];
  let _syncPipesAfterAsync = new Map(); // {[Async{name, pipe}] => [Sync{name, pipe}]}

  let _handleSuccFinish = noop;
  let _handleErrFinish = noop;

  let _defaultReducePipe = (pre, cur) => {
    pre.push(cur);
    return pre;
  };
  let _defaultReduceInitial = [];

  let wrapper = {
    /**
     * 同步执行函数
     * @param  {Object} pipeObj [description]
     * @return {[type]}         [description]
     */
    flow(pipeObj) {
      let {pipe} = pipeObj = _preparePipeObj(pipeObj, 'flow');
      _assertPipeFunc('pipeline.flow', pipe);

      if (_blocking) {
        let lastAsyncPipe = _asyncPipeQueue.slice(-1)[0];
        lastAsyncPipe && _syncPipesAfterAsync.get(lastAsyncPipe).push(pipeObj);
      } else {
        _value = _execSyncPipe(_value, pipeObj);
      }

      return wrapper;
    },

    flowAsync(pipeObj) {
      pipeObj = _preparePipeObj(pipeObj, 'flowAsync');

      _asyncPipeQueue.push(pipeObj);
      _syncPipesAfterAsync.set(pipeObj, []);
      _blocking || _execAsyncPipe();
      return wrapper;
    },

    mapFlow(pipeObj) {
      pipeObj = _preparePipeObj(pipeObj, 'flowAsync');

      return wrapper;
    },

    reduceFlow(pipe=_defaultReducePipe, initialValue=_defaultReduceInitial) {
      return wrapper;
    },

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

  function _assertPipeFunc(methodName, pipe) {
    if ( !(pipe instanceof Function) ) {
      throw new Error(`the pipe prop in pipeObj argument of [${methodName}] must be function!`);
    }
  }

  function _preparePipeObj(pipeObj, type) {
    if (!type) {
      throw new Error('_preparePipeObj need "type" argument');
    }

    if (pipeObj instanceof Function) pipeObj = {pipe: pipeObj};

    let {name, pipe} = pipeObj;
    _assertPipeFunc(`pipeline.${type}`, pipe);

    _pipeCount++;
    return {
      name: name ? name : `${_pipeCount}[${type}]`,
      pipe
    };
  }

  function _execSyncPipe(value, {name, pipe, preMixins=[], postMixins=[]}) {
    // TODO Mixins
    return pipe(value);
  }

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
        for (let syncPipeObj of _syncPipesAfterAsync.get(pipeObj)) {
          _value = _execSyncPipe(_value, syncPipeObj);
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
 *       preMixins: [
 *         ({value, name, pipe}) => {
 *           console.log(name + value);
 *           return {value, name, pipe};
 *         },
 *         ({value, name, pipe}) => {
 *           return {value: Number(value), name, pipe};
 *         }
 *        ],
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
   * 添加在所有 pipe 运行之前执行的 Mixin 函数。函数执行顺序为数组顺序。
   *
   * @param  {Array Function|Function}  mixins
   *     一个函数或者函数数组，函数的参数为一个对象：
   *     ```
   *     {
   *       value: '', // 当前数据流中的数据
   *       pipe: '', // 当前执行的 pipe 函数
   *       name: '' // 当前执行的 pipe 名称
   *     }
   *     ```
   *     函数也必须返回一个和参数同样结构的数组
   *
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
