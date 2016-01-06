let noop = () => {};

/**
 * 生成一个处理数据的 Pipeline 包装
 *
 * @param  {AnyType} value      待处理的值
 * @param  {Object} prePipeline
 *     ## 定义 Pipeline 开始前进的操作。
 *     ```
 *     {
 *       name: [String],  // Default 'Start Pipeline'
 *       mixins: [Array]
 *      }
 *     ```
 * @return {Object}        一个包含 flow 和 finish 属性的对象。 两个属性均为函数。
 *                         两个属性均接受一个函数作为，该函数接受一个数据，并返回一个新的数据
 */
export function pipelineWrap (input, prePipeline={}) {
  let _preP = prePipeline;
  _preP.name = _preP.name || 'Finish Pipeline';
  _preP.mixins = _preP.mixins || [];

  let _pre = globalExecMixins(_preP.mixins, {name: _preP.name, value: input});
  let _output = _pre.value;
  let _pipeCount = 0;
  // 执行异步 Pipe 时设置为 true
  let _blocking = false;
  // 异步 Pipe 队列。当 Pipe 执行完成后才会从队列中移除
  let _asyncPipeQueue = [/*{name, pipe}*/];
  // 异步 Pipe 之后的同步 Pipe 队列
  let _syncPipesAfterAsync = new Map(); // {[Async{name, pipe}] => [Sync{name, pipe}]}

  let _handleSuccFinish = noop;
  let _handleErrFinish = noop;

  let wrapper = {
    /**
     * 同步执行函数
     * @param  {Object} pipeObj [description]
     * @return {[type]}         [description]
     */
    flow(pipeObj) {
      pipeObj = _preparePipeObj(pipeObj, 'flow');
      _addSyncPipe(pipeObj);
      return wrapper;
    },

    flowAsync(pipeObj) {
      pipeObj = _preparePipeObj(pipeObj, 'flowAsync');

      _asyncPipeQueue.push(pipeObj);
      _syncPipesAfterAsync.set(pipeObj, []);
      _blocking || _execAsyncPipe(_output);
      return wrapper;
    },

    mapFlow(pipeObj) {
      pipeObj = _preparePipeObj(pipeObj, 'mapFlow');
      pipeObj.type = 'map';
      _addSyncPipe(pipeObj);
      return wrapper;
    },

    /**
     * @param  {Object} pipeObj {name, pipe, initialValue, preMixins, postMixins}
     * @return {[type]}         [description]
     */
    reduceFlow(pipeObj) {
      pipeObj = _preparePipeObj(pipeObj, 'reduceFlow');
      pipeObj.type = 'reduce';
      _addSyncPipe(pipeObj);
      return wrapper;
    },

    finish(postPipeline={}) {
      let postP = postPipeline;
      postP.name = postP.name || 'Finish Pipeline';
      postP.mixins = postP.mixins || [];

      if (_blocking || _asyncPipeQueue.length) {
        return new Promise((resolve, reject) => {
          _handleSuccFinish = output => {
            let post = globalExecMixins(postP.mixins, {name: postP.name, value: output});
            resolve(post.value);
          };
          _handleErrFinish = err => reject(err);
        });
      } else {
        return _output;
      }
    }
  };

  function _assertPipeFunc(methodName, pipe) {
    if ( !(pipe instanceof Function) ) {
      throw new Error(`the pipe prop in pipeObj argument of [${methodName}] must be function!`);
    }
  }

  function _preparePipeObj(pipeObj, type) {
    if ( !(pipeObj && type) ) {
      throw new Error('_preparePipeObj need "type" and "pipeObj" arguments');
    }

    if (pipeObj instanceof Function) pipeObj = {pipe: pipeObj};

    let {name, pipe, preMixins=[], postMixins=[]} = pipeObj;
    _assertPipeFunc(`pipeline.${type}`, pipe);

    _pipeCount++;
    return {
      // reduceFlow 还需要 initialValue 参数
      ...pipeObj,
      name: name ? name : `${_pipeCount}[${type}]`,
      pipe,
      preMixins,
      postMixins
    };
  }

  function _addSyncPipe(pipeObj) {
    if (_blocking) {
      let lastAsyncPipe = _asyncPipeQueue.slice(-1)[0];
      lastAsyncPipe && _syncPipesAfterAsync.get(lastAsyncPipe).push(pipeObj);
    } else {
      _output = _execAllSyncPipe(_output, pipeObj);
    }
  }

  function _execAllSyncPipe(pipeInput, pipeObj) {
    switch(pipeObj.type) {
    case 'map':
      return _execSyncMapPipe(pipeInput, pipeObj);
    case 'reduce':
      return _execSyncReducePipe(pipeInput, pipeObj);
    default:
      return _execSyncPipe(pipeInput, pipeObj);
    }
  }

  function _execSyncMapPipe(pipeInput, pipeObj) {
    pipeInput = [].concat(pipeInput);
    return pipeInput.map((v, index) => {
      return _execSyncPipe(v, {
        ...pipeObj,
        name: `${pipeObj.name}-${index}`
      });
    });
  }

  function _execSyncReducePipe(pipeInput, pipeObj) {
    pipeInput = [].concat(pipeInput);
    return _execSyncPipe(pipeInput, {
      ...pipeObj,
      pipe: iPipeInput => {
        return iPipeInput.reduce(pipeObj.pipe, pipeObj.initialValue);
      }
    });
  }

  function _execSyncPipe(pipeInput, {name, pipe, preMixins=[], postMixins=[]}) {
    let pre = globalExecMixins(preMixins, {value: pipeInput, name, pipe});
    let output = pre.pipe(pre.value);
    let post = globalExecMixins(postMixins, {...pre, value: output});
    return post.value;
  }

  function _execAsyncPipe(pipeInput) {
    let pipeObj = _asyncPipeQueue[0];
    let {name, pipe, preMixins=[], postMixins=[]} = pipeObj;

    let pre = globalExecMixins(preMixins, {value: pipeInput, name, pipe});
    let promise = pre.pipe(pre.value);

    if (!(promise.then instanceof Function && promise.catch instanceof Function)) {
      throw new Error(`
        [pipelineWrap.flowAsync][${name}] accept a \`function(data)\`
        should return Promise instance!
      `);
    }

    _blocking = true;

    promise
      .then(data => {
        let post = globalExecMixins(postMixins, {...pre, value: data});

        let output = post.value;
        _blocking = false;

        for (let syncPipeObj of _syncPipesAfterAsync.get(pipeObj)) {
          output = _execAllSyncPipe(output, syncPipeObj);
        }

        _asyncPipeQueue.shift();
        _syncPipesAfterAsync.delete(pipeObj);

        if (_asyncPipeQueue.length) {
          _execAsyncPipe(output);
        } else {
          _handleSuccFinish(output);
        }
      })
      .catch(err => {
        _handleErrFinish(err);
      });
  }

  return wrapper;
}

/**
 * 执行 Mixins
 * @param  {Function Array} mixins
 * @param  {Object} mixinArg
 *     ```
 *     {
 *       name,
 *       pipe,
 *       value
 *     }
 *     ```
 * @return {Object} 和 mixinArg 一样的对象结构
 */
function globalExecMixins(mixins, mixinArg) {
  return mixins.reduce((arg, cur) => {
    return cur(arg);
  }, mixinArg);
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

  // pipeline 运行前执行
  static prePipelineMixins = [];

  // pipeline 运行后执行
  static postPipelineMixins = [];

  // 所有 pipe 运行前执行
  static commonPreMixins = [];

  // 所有 pipe 运行后执行
  static commonPostMixins = [];

  static concatPrePipelineMixins(mixins=[]) {
    Pipeline.prePipelineMixins.concat(mixins);
  }

  static concatPostPipelineMixins(mixins=[]) {
    Pipeline.postPipelineMixins.concat(mixins);
  }
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
    Pipeline.commonPreMixins.concat(mixins);
  }

  static concatCommonPostMixins(mixins=[]) {
    Pipeline.commonPostMixins.concat(mixins);
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
