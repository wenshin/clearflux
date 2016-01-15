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
                                        verbose: _verbose=false,
                                        middlewares: _pipelineMiddlewares=[]
                                      }={}) {
  let _pipeMiddlewares = [];
  let _prePipeline = _execMiddleware(
    _pipelineMiddlewares, _warpPipeState(_input), 'pre',
    function (middleware) {
      middleware.pipeMiddleware && _pipeMiddlewares.push(middleware.pipeMiddleware);
    }
  );
  let _output = _prePipeline.value;
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
      _blocking || _execAsyncPipe(_output);
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
        return finishSuccess(_output).value;
      }

      function finishSuccess(value) {
        return _execMiddleware(_pipelineMiddlewares, _warpPipeState(value), 'post');
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
      _output = _execAllSyncPipe(_output, pipe);
    }
  }

  function _execAllSyncPipe(pipeInput, pipe) {
    switch(pipe.type) {
    case 'map':
      return _execSyncMapPipe(pipeInput, pipe);
    case 'reduce':
      return _execSyncReducePipe(pipeInput, pipe);
    default:
      return _execSyncPipe(pipeInput, pipe);
    }
  }

  function _execSyncMapPipe(pipeInput, pipe) {
    pipeInput = [].concat(pipeInput);
    let output = [];

    let filter = pipe.filter;
    if ( !(filter && filter instanceof Function) ) filter = () => true;

    pipeInput.map((item, index) => {
      let cpPipe = {...pipe, name: `${pipe.name}-${index}`};
      let keep = filter(item, index);
      // 不被接受的数据
      if (!keep) {
        cpPipe.name = cpPipe.name + '-dropped';
        cpPipe.handle = v => v;
      }
      let out = _execSyncPipe(item, cpPipe);
      keep && output.push(out);
    });
    return output;
  }

  function _execSyncReducePipe(pipeInput, pipe) {
    pipeInput = [].concat(pipeInput);
    return _execSyncPipe(pipeInput, {
      ...pipe,
      handle: iPipeInput => {
        return iPipeInput.reduce(pipe.handle, pipe.initialValue);
      }
    });
  }

  function _execSyncPipe(pipeInput, pipe) {
    return _execSyncPipeWithMiddlewares(pipe.middlewares, _warpPipeState(pipeInput, pipe));
  }

  function _execAsyncPipe(pipeInput) {
    let pipe = _asyncPipeQueue[0];
    let {name, middlewares=[]} = pipe;

    let preState = _execPipeMiddleware(middlewares, _warpPipeState(pipeInput, pipe), 'pre');
    if (preState.skip) return;

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
        let postState = _execPipeMiddleware(middlewares, {...preState, value: data}, 'post');

        let output = postState.value;
        _blocking = false;

        for (let syncPipeObj of _syncPipesAfterAsync.get(pipe)) {
          output = _execAllSyncPipe(output, syncPipeObj);
        }

        _asyncPipeQueue.shift();
        _syncPipesAfterAsync.delete(pipe);

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

  function _execPipeMiddleware(middlewares, inputState, type, handle) {
    middlewares = [].concat(middlewares, _pipeMiddlewares);
    return _execMiddleware(middlewares, inputState, type, handle);
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
  function _execMiddleware(middlewares, inputState, type, handle) {
    _console('group')(`\n* Run Middlewar Group`);
    _console()('inputState: ', inputState, type);

    let outputState = inputState;

    if (middlewares.length) {
      outputState = middlewares.reduce((state, middleware) => {
        _console()(` + Run Middlewar ${middleware.name} ${type} Handler: `);
        _console()('   - State: ', state);

        assertState(state);
        assertMiddleware(middleware, type);
        handle && handle(middleware);
        let newState = middleware[type] ? middleware[type](state) : state;

        _console()('   - NextState: ', newState);
        return newState;
      }, inputState);
    }
    _console('groupEnd')(`* End Middlewar Group\n`);
    return outputState;
  }

  function _execSyncPipeWithMiddlewares(middlewares, inputState) {
    let preState = _execPipeMiddleware(middlewares, inputState, 'pre');
    let outputState = {...preState};
    if (!preState.skip) outputState.value = preState.pipe.handle(preState.value);
    let newState = _execPipeMiddleware(middlewares.reverse(), outputState, 'post');
    return newState.value;
  }

  function _warpPipeState(value=_output, pipe={}) {
    return {name: _pipelineName, value, pipe, skip: false};
  }

  function _console(type='log') {
    let logger = console[type] ? console[type] : console.log; // eslint-disable-line no-console
    return function () {
      _verbose && logger.apply(console, arguments); // eslint-disable-line no-console
    };
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

