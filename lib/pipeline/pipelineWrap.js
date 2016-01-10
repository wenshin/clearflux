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
 *       middlewares: [Array]
 *      }
 *     ```
 * @return {Object}        一个包含 flow 和 finish 属性的对象。 两个属性均为函数。
 *                         两个属性均接受一个函数作为，该函数接受一个数据，并返回一个新的数据
 */
export default function pipelineWrap (input, prePipeline={}) {
  let _preP = prePipeline;
  _preP.name = _preP.name || 'Finish Pipeline';
  _preP.middlewares = _preP.middlewares || [];

  let _pre = globalExecMiddlewares(_preP.middlewares, {name: _preP.name, value: input});
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

    /**
     * @param  {Object} pipeObj
     *     ```
     *     {name, pipe, filter, initialValue, preMiddlewares, postMiddlewares}
     *     ```
     *     filter 接受和 Array.map 相同的参数，返回 false 代表该数据会被丢弃
     * @return {Object}         wrapper
     */
    mapFlow(pipeObj) {
      pipeObj = _preparePipeObj(pipeObj, 'mapFlow');
      pipeObj.type = 'map';
      _addSyncPipe(pipeObj);
      return wrapper;
    },

    /**
     * @param  {Object} pipeObj
     *     ```
     *     {name, pipe, initialValue, preMiddlewares, postMiddlewares}
     *     ```
     *     pipe, initialValue 分别对应 Array.reduce(callback[, initialValue]) 的参数
     * @return {Object}         wrapper
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
      postP.middlewares = postP.middlewares || [];

      if (_blocking || _asyncPipeQueue.length) {
        return new Promise((resolve, reject) => {
          _handleSuccFinish = output => {
            let post = globalExecMiddlewares(postP.middlewares, {name: postP.name, value: output});
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

    let {name, pipe, preMiddlewares=[], postMiddlewares=[]} = pipeObj;
    _assertPipeFunc(`pipeline.${type}`, pipe);

    _pipeCount++;
    return {
      // reduceFlow 还需要 initialValue 参数
      ...pipeObj,
      name: name ? name : `${_pipeCount}[${type}]`,
      pipe,
      preMiddlewares,
      postMiddlewares
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
    let output = [];

    let filter = pipeObj.filter;
    if ( !(filter && filter instanceof Function) ) filter = () => true;

    pipeInput.map((item, index) => {
      let cpPipe = {...pipeObj, name: `${pipeObj.name}-${index}`};
      let keep = filter(item, index);
      // 不被接受的数据
      if (!keep) {
        cpPipe.name = cpPipe.name + '-dropped';
        cpPipe.pipe = v => v;
      }
      let out = _execSyncPipe(item, cpPipe);
      keep && output.push(out);
    });
    return output;
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

  function _execSyncPipe(pipeInput, {name, pipe, preMiddlewares=[], postMiddlewares=[]}) {
    let pre = globalExecMiddlewares(preMiddlewares, {value: pipeInput, name, pipe});
    let output = pre.pipe(pre.value);
    let post = globalExecMiddlewares(postMiddlewares, {...pre, value: output});
    return post.value;
  }

  function _execAsyncPipe(pipeInput) {
    let pipeObj = _asyncPipeQueue[0];
    let {name, pipe, preMiddlewares=[], postMiddlewares=[]} = pipeObj;

    let pre = globalExecMiddlewares(preMiddlewares, {value: pipeInput, name, pipe});
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
        let post = globalExecMiddlewares(postMiddlewares, {...pre, value: data});

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
 * 执行 Middlewares
 * @param  {Function Array} middlewares
 * @param  {Object} middlewareArg
 *     ```
 *     {
 *       name,
 *       pipe,
 *       value
 *     }
 *     ```
 * @return {Object} 和 middlewareArg 一样的对象结构
 */
function globalExecMiddlewares(middlewares, middlewareArg) {
  return middlewares.reduce((arg, cur) => {
    return cur(arg);
  }, middlewareArg);
}
