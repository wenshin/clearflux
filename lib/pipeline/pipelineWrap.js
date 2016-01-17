import _isPlainObject from 'lodash/lang/isPlainObject';

let noop = () => {};

/**
 * 生成一个处理数据的 Pipeline 包装
 *
 * @param  {AnyType} value               待处理的值
 *
 * @param  {String}  config.name         名称
 * @param  {Boolean} config.verbose      是否打印日志
 * @param  {Array}   config.middlewares  中间件
 *
 * @return {Object}
 *     一个包含 flow、flowAsync、flowMap、flowReduce 和 finish 属性的对象，属性均为函数。
 */
export default function pipelineWrap (_input, {
                                        name: _pipelineName='',
                                        middlewares: _pipelineMiddlewares=[]
                                      }={}) {
  let _outputState = {
    name: _pipelineName,
    value: _input,
    pipe: v => v,
    skip: false,
    middlewareStack: []
  };

  let _commonPipeMiddlewares = [];
  _outputState = _execMiddlewares(
    _pipelineMiddlewares, _outputState, 'pre',
    middleware => {
      middleware.pipeMiddleware && _commonPipeMiddlewares.push(middleware.pipeMiddleware);
    }
  );

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
     * @param  {Object} pipe
     *     ```
     *     {name, handle, middlewares}
     *     ```
     * @return {[type]}         [description]
     */
    flow(pipe) {
      pipe = _preparePipe(pipe, 'flow');
      _addSyncPipe(pipe);
      return wrapper;
    },

    flowAsync(pipe) {
      pipe = _preparePipe(pipe, 'flowAsync');
      _asyncPipeQueue.push(pipe);
      _syncPipesAfterAsync.set(pipe, []);
      _blocking || _execAsyncPipe({..._outputState, pipe});
      return wrapper;
    },

    /**
     * @param  {Object} pipe
     *     ```
     *     {name, handle, filter, middlewares}
     *     ```
     *     filter 接受和 Array.map 相同的参数，返回 false 代表该数据会被丢弃
     * @return {Object}         wrapper
     */
    mapFlow(pipe) {
      pipe = _preparePipe(pipe, 'mapFlow');
      pipe.type = 'map';
      _addSyncPipe(pipe);
      return wrapper;
    },

    /**
     * @param  {Object} pipe
     *     ```
     *     {name, handle, initialValue, middlewares}
     *     ```
     *     handle, initialValue 分别对应 Array.reduce(callback[, initialValue]) 的参数
     * @return {Object}         wrapper
     */
    reduceFlow(pipe) {
      pipe = _preparePipe(pipe, 'reduceFlow');
      pipe.type = 'reduce';
      _addSyncPipe(pipe);
      return wrapper;
    },

    finish() {
      if (_blocking || _asyncPipeQueue.length) {
        return new Promise((resolve, reject) => {
          _handleSuccFinish = output => {
            resolve(finishSuccess(output).value);
          };
          _handleErrFinish = err => {
            reject(err);
          };
        });
      } else {
        return finishSuccess(_outputState).value;
      }

      function finishSuccess(state) {
        state = _resetPipeState(state);
        return _execMiddlewares(_pipelineMiddlewares, state, 'post');
      }
    }
  };

  function _assertPipeFunc(methodName, pipeHandle) {
    if ( !(pipeHandle instanceof Function) ) {
      throw new TypeError(`the handle prop in pipe argument of [${methodName}] must be function!`);
    }
  }

  function _preparePipe(pipe, type) {
    if ( !(pipe && type) ) {
      throw new Error('_preparePipe need "type" and "pipe" arguments');
    }

    if (pipe instanceof Function) pipe = {handle: pipe};

    let {name, handle, middlewares=[]} = pipe;
    _assertPipeFunc(`pipeline.${type}`, handle);

    _pipeCount++;
    return {
      // reduceFlow 还有 initialValue 参数
      // mapFlow 还有 filter 参数
      ...pipe,
      name: name ? name : `pipe-${_pipeCount}-${type}`,
      order: _pipeCount,
      handle,
      middlewares
    };
  }

  function _addSyncPipe(pipe) {
    if (_blocking) {
      let lastAsyncPipe = _asyncPipeQueue.slice(-1)[0];
      lastAsyncPipe && _syncPipesAfterAsync.get(lastAsyncPipe).push(pipe);
    } else {
      _outputState = _execAllSyncPipe({..._outputState, pipe});
    }
  }

  function _execAllSyncPipe(state) {
    switch(state.pipe.type) {
    case 'map':
      return _execSyncMapPipe(state);
    case 'reduce':
      return _execSyncReducePipe(state);
    default:
      return _execSyncPipe(state);
    }
  }

  function _execSyncMapPipe(state) {
    let {value, pipe} = state;
    let pipeInput = value;
    let isObject = _isPlainObject(value);
    let objKeys = [];

    if (Array.isArray(value)) {
      pipeInput = [].concat(value);
    } else if (isObject) {
      objKeys = Object.keys(value);
      pipeInput = objKeys.map(key => value[key]);
    }

    let output = isObject ? {} : [];

    let filter = pipe.filter;
    if ( !(filter && filter instanceof Function) ) filter = () => true;

    pipeInput.map((item, index) => {
      index = isObject ? objKeys[index] : index;
      let cpPipe = {...pipe, name: `${pipe.name}-${index}`};
      let keep = filter(item, index);
      // 不被接受的数据
      if (!keep) {
        cpPipe.name = cpPipe.name + '-dropped';
        cpPipe.handle = v => v;
      }
      let outputState = _execSyncPipe({...state, pipe: cpPipe, value: item});
      keep && (
        isObject ? (output[index] = outputState.value) : output.push(outputState.value)
      );
    });
    return {...state, value: output};
  }

  function _execSyncReducePipe(state) {
    let {pipe, value} = state;
    let isObject = _isPlainObject(value);

    if (Array.isArray(value)) {
      value = [].concat(value);
    } else if (isObject) {
      value = Object.keys(value).map(key => value[key]);
    }

    state.value = value;
    state.pipe = {
      ...pipe,
      handle: v => {
        return v.reduce(pipe.handle, pipe.initialValue);
      }
    };
    return _execSyncPipe(state);
  }

  function _execSyncPipe(state) {
    state = _resetPipeState(state);
    let {middlewares} = state.pipe;

    let preState = _execPipeMiddlewares(middlewares, state, 'pre');

    let outputState = {...preState, skip: false};
    if (!preState.skip) outputState.value = preState.pipe.handle(preState.value);

    return _execPipeMiddlewares(middlewares, outputState, 'post');
  }

  function _execAsyncPipe(inputState) {
    inputState = _resetPipeState(inputState);

    let pipe = _asyncPipeQueue[0];
    let {name, middlewares=[]} = pipe;

    let preState = _execPipeMiddlewares(middlewares, {...inputState, pipe}, 'pre');
    let outputState = {...preState, skip: false};
    if (preState.skip) nextPipe(outputState);

    let promise = preState.pipe.handle(preState.value);
    if (!(promise && promise.then instanceof Function && promise.catch instanceof Function)) {
      throw new Error(`
        [pipelineWrap.flowAsync][${name}] accept a \`Function(pipeState)\`
        should return Promise instance!
      `);
    }

    _blocking = true;

    promise
      .then(data => {
        let postState = _execPipeMiddlewares(middlewares, {...outputState, value: data}, 'post');
        nextPipe(postState);
      })
      .catch(err => {
        _handleErrFinish(err);
      });

    function nextPipe(state) {
      _blocking = false;

      for (let syncPipe of _syncPipesAfterAsync.get(pipe)) {
        state = _execAllSyncPipe({...state, pipe: syncPipe});
      }

      // 把异步管道退出队列
      _asyncPipeQueue.shift();
      // 删除依赖关系
      _syncPipesAfterAsync.delete(pipe);

      if (_asyncPipeQueue.length) {
        _execAsyncPipe(state);
      } else {
        _handleSuccFinish(state);
      }
    }
  }

  function _execPipeMiddlewares(middlewares, inputState, handlerType, handle) {
    middlewares = [].concat(middlewares, _commonPipeMiddlewares);
    return _execMiddlewares(middlewares, inputState, handlerType, handle);
  }

  /**
   * 执行 Middlewares
   * @param  {Function Array} middlewares
   * @param  {Object} inputState
   *     ```
   *     {
   *       name, // Pipeline Name
   *       pipe: {name: '', handle: '', middlewares},
   *       value,
   *       skip // 如果是 true 将会跳过当前 Pipe
   *     }
   *     ```
   * @return {Object} 和 inputState 一样的对象结构
   */
  function _execMiddlewares(middlewares, inputState, handlerType, handle) {
    let outputState = inputState;

    if (middlewares.length) {
      outputState = middlewares.reduce((state, middleware) => {
        assertState(state);
        assertMiddleware(middleware, handlerType);
        handle && handle(middleware);
        let newState = Object.assign(state);
        if (middleware[handlerType]) {
          newState = middleware[handlerType](state);
          newState.middlewareStack.push({
            handlerType, middleware,
            inputState: state, outputState: newState
          });
        }
        return newState;
      }, inputState);
    }
    return outputState;
  }

  function _resetPipeState(state) {
    return {...state, middlewareStack: []};
  }

  return wrapper;
}

/**
 * Utils
 */
function assertState(state) {
  if (!state.pipe || !state.value) {
    throw new TypeError('Middleware handler should return a Object contain pipe and value properties');
  }
}

function assertMiddleware(middleware, type) {
  if (middleware[type] && !(middleware[type] instanceof Function)) {
    throw new TypeError('Middleware handler should be a function');
  }
}

export function BreakPipeline(message) {
  this.name = 'BreakPipeline';
  this.message = message || '';
}

BreakPipeline.prototype = Error.prototype;

