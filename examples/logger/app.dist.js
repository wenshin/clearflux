(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _pipeline = require('./pipeline');

var _pipeline2 = _interopRequireDefault(_pipeline);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _pipeline2.default;
},{"./pipeline":3}],2:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
var PipeLoggerMiddleware = exports.PipeLoggerMiddleware = {
  type: 'pipe',
  name: 'PipeLoggerMiddleware',
  pre: function pre(pipeState) {
    var _pipeState$pipe = pipeState.pipe;
    var _pipeState$pipe$name = _pipeState$pipe.name;
    var name = _pipeState$pipe$name === undefined ? '' : _pipeState$pipe$name;
    var _pipeState$pipe$order = _pipeState$pipe.order;
    var order = _pipeState$pipe$order === undefined ? '' : _pipeState$pipe$order;

    _console('info')(pipeState.value + ' >>> ' + (name || 'pipe' + order), pipeState);
    return _extends({}, pipeState, { skip: true });
  },
  post: function post(pipeState) {
    var _pipeState$pipe2 = pipeState.pipe;
    var _pipeState$pipe2$name = _pipeState$pipe2.name;
    var name = _pipeState$pipe2$name === undefined ? '' : _pipeState$pipe2$name;
    var _pipeState$pipe2$orde = _pipeState$pipe2.order;
    var order = _pipeState$pipe2$orde === undefined ? '' : _pipeState$pipe2$orde;

    _console('info')(pipeState.value + ' <<< ' + (name || 'pipe' + order), pipeState);
    return pipeState;
  }
};

var PipelineLoggerMiddleware = {
  type: 'pipeline',
  name: 'PipelineLoggerMiddleware',
  pre: function pre(pipeState) {
    _console('groupCollapsed')('Start Pipeline: ' + pipeState.name);
    return pipeState;
  },
  post: function post(pipeState) {
    _console('groupEnd')();
    return pipeState;
  },

  pipeMiddleware: PipeLoggerMiddleware
};

function _console() {
  var type = arguments.length <= 0 || arguments[0] === undefined ? 'log' : arguments[0];

  if (!console) return;
  return (console[type] || console.log).bind(console); // eslint-disable-line no-console
}

exports.default = PipelineLoggerMiddleware;
},{}],3:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pipelineWrap = require('./pipelineWrap');

var _pipelineWrap2 = _interopRequireDefault(_pipelineWrap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Middleware 设计为可拦截
 *
 * function(value, pipeObj) {
 *   // pipe 设置为 undefined Pipeline 将终止，而且只能在 PipeMiddleware.
 *   pipeObj.pipe = undefined;
 * }
 *
 * @Pipeline 概念介绍
 * (1): PipelineMiddleware1.pre
 * (2): PipeMiddleware1.pre
 * (3): PipeMiddleware1.post
 * (4): PipeMiddleware2.pre
 * (5): PipeMiddleware2.post
 * (6): PipelineMiddleware1.post
 * - - - - - - - - +------+ - - - - - - - - - +------+ - - - - - - - -
 * | (1) | (2) (3) | pipe | (4) (5) | (2) (3) | pipe | (4) (5) | (6) |
 * - - - - - - - - +------+ - - - - - - - - - +------+ - - - - - - - -
 *
 * @Usage:
 *   ```
 *   let pipeline = new Pipeline('myPipeline', [
 *     {name: 'pipe1', handle: v => v, type: 'flowAsync', middlewares=[]},
 *     {name: 'pipe2', handle: () => {}, middlewares=[]}
 *   ]);
 *   ```
 */

var Pipeline = (function () {
  _createClass(Pipeline, null, [{
    key: 'applyPipelineMiddlewares',

    /**
     * 追加 Pipeline 层次的中间件。
     *
     * @param  {Array PipelineMiddleware|PipelineMiddleware}  middlewares
     *     PipelineMiddleware 对象，Pipeline 层次的中间件
     *     ```
     *     {
     *       name: 'FooPipelinePlugin',
     *       type: 'pipeline',
     *       pre: Function(PipeState state),
     *       post: Function(PipeState state)
     *       pipeMiddleware: PipeMiddleware
     *     }
     *     ```
     *     函数也必须返回一个和参数同样结构的数组
     *     PipeState。中间件处理函数，接受一个 PipeState 对象作为参数
     *     ```
     *     {
     *       name: '', // Pipe 的名称
     *       value: '', // 当前值
     *       pipe: Function(value),
     *       skip: false
     *     }
     *     ```
     * @return {undefined}
     */

    // Pipeline 层的中间件
    value: function applyPipelineMiddlewares() {
      var middlewares = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

      Pipeline.pipelineMiddlewares = Pipeline.pipelineMiddlewares.concat(middlewares);
    }

    /**
     * 追加 Pipe 层次的中间件。
     *
     * @param  {Array PipeMiddleware|PipeMiddleware}  middlewares
     *     PipeMiddleware 对象，Pipeline 层次的中间件
     *     ```
     *     {
     *       name: 'FooPipePlugin',
     *       type: 'pipe',
     *       pre: Function(PipeState state),
     *       post: Function(PipeState state)
     *     }
     *     ```
     *     函数也必须返回一个和参数同样结构的数组
     *
     * @return {undefined}
     */

    // Pipe 层通用中间件，pre 优先执行，post 倒序执行

  }, {
    key: 'applyCommonPipeMiddlewares',
    value: function applyCommonPipeMiddlewares() {
      var middlewares = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

      Pipeline.commonPipeMiddlewares = Pipeline.commonPipeMiddlewares.concat(middlewares);
    }
  }]);

  function Pipeline() {
    var _this = this;

    var name = arguments.length <= 0 || arguments[0] === undefined ? 'pipeline' : arguments[0];
    var pipes = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

    _classCallCheck(this, Pipeline);

    this._name = name;
    this._pipes = pipes;
    var delegate = function delegate(prop) {
      return Array.prototype[prop].bind(_this._pipes);
    };
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = Pipeline.inheritProps[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var prop = _step.value;

        this[prop] = delegate(prop);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  }

  _createClass(Pipeline, [{
    key: 'flow',
    value: function flow(data) {
      var pipelined = (0, _pipelineWrap2.default)(data, {
        name: this._name,
        middlewares: Pipeline.pipelineMiddlewares
      });
      pipelined = this.reduce(function (_pipelined, _ref) {
        var name = _ref.name;
        var handle = _ref.handle;
        var _ref$type = _ref.type;
        var type = _ref$type === undefined ? 'flow' : _ref$type;
        var _ref$middlewares = _ref.middlewares;
        var middlewares = _ref$middlewares === undefined ? [] : _ref$middlewares;

        return _pipelined[type]({
          name: name, handle: handle,
          middlewares: Pipeline.commonPipeMiddlewares.concat(middlewares)
        });
      }, pipelined);
      return pipelined.finish();
    }
  }]);

  return Pipeline;
})();

Pipeline.inheritProps = ['push', 'pop', 'shift', 'unshift', 'concat', 'slice', 'splice', 'filter', 'map', 'reduce'];
Pipeline.pipelineMiddlewares = [];
Pipeline.commonPipeMiddlewares = [];
exports.default = Pipeline;
},{"./pipelineWrap":4}],4:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = pipelineWrap;
exports.BreakPipeline = BreakPipeline;
var noop = function noop() {};

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
function pipelineWrap(_input) {
  var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var _ref$name = _ref.name;

  var _pipelineName = _ref$name === undefined ? '' : _ref$name;

  var _ref$verbose = _ref.verbose;

  var _verbose = _ref$verbose === undefined ? false : _ref$verbose;

  var _ref$middlewares = _ref.middlewares;

  var _pipelineMiddlewares = _ref$middlewares === undefined ? [] : _ref$middlewares;

  var _pipeMiddlewares = [];
  var _prePipeline = _execMiddleware(_pipelineMiddlewares, _warpPipeState(_input), 'pre', function (middleware) {
    middleware.pipeMiddleware && _pipeMiddlewares.push(middleware.pipeMiddleware);
  });
  var _output = _prePipeline.value;
  var _pipeCount = 0;
  // 执行异步 Pipe 时设置为 true
  var _blocking = false;
  // 异步 Pipe 队列。当 Pipe 执行完成后才会从队列中移除
  var _asyncPipeQueue = [/*{name, pipe}*/];
  // 异步 Pipe 之后的同步 Pipe 队列
  var _syncPipesAfterAsync = new Map(); // {[Async{name, pipe}] => [Sync{name, pipe}]}

  var _handleSuccFinish = noop;
  var _handleErrFinish = noop;

  var wrapper = {
    /**
     * 同步执行函数
     * @param  {Object} pipe
     *     ```
     *     {name, handle, middlewares}
     *     ```
     * @return {[type]}         [description]
     */

    flow: function flow(pipe) {
      pipe = _preparePipe(pipe, 'flow');
      _addSyncPipe(pipe);
      return wrapper;
    },
    flowAsync: function flowAsync(pipe) {
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
    mapFlow: function mapFlow(pipe) {
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
    reduceFlow: function reduceFlow(pipe) {
      pipe = _preparePipe(pipe, 'reduceFlow');
      pipe.type = 'reduce';
      _addSyncPipe(pipe);
      return wrapper;
    },
    finish: function finish() {
      if (_blocking || _asyncPipeQueue.length) {
        return new Promise(function (resolve, reject) {
          _handleSuccFinish = function (output) {
            resolve(finishSuccess(output).value);
          };
          _handleErrFinish = function (err) {
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
    if (!(pipeHandle instanceof Function)) {
      throw new TypeError('the handle prop in pipe argument of [' + methodName + '] must be function!');
    }
  }

  function _preparePipe(pipe, type) {
    if (!(pipe && type)) {
      throw new Error('_preparePipe need "type" and "pipe" arguments');
    }

    if (pipe instanceof Function) pipe = { handle: pipe };

    var _pipe = pipe;
    var name = _pipe.name;
    var handle = _pipe.handle;
    var _pipe$middlewares = _pipe.middlewares;
    var middlewares = _pipe$middlewares === undefined ? [] : _pipe$middlewares;

    _assertPipeFunc('pipeline.' + type, handle);

    _pipeCount++;
    return _extends({}, pipe, {
      name: name ? name : 'pipe-' + _pipeCount + '-' + type,
      order: _pipeCount,
      handle: handle,
      middlewares: middlewares
    });
  }

  function _addSyncPipe(pipe) {
    if (_blocking) {
      var lastAsyncPipe = _asyncPipeQueue.slice(-1)[0];
      lastAsyncPipe && _syncPipesAfterAsync.get(lastAsyncPipe).push(pipe);
    } else {
      _output = _execAllSyncPipe(_output, pipe);
    }
  }

  function _execAllSyncPipe(pipeInput, pipe) {
    switch (pipe.type) {
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
    var output = [];

    var filter = pipe.filter;
    if (!(filter && filter instanceof Function)) filter = function () {
      return true;
    };

    pipeInput.map(function (item, index) {
      var cpPipe = _extends({}, pipe, { name: pipe.name + '-' + index });
      var keep = filter(item, index);
      // 不被接受的数据
      if (!keep) {
        cpPipe.name = cpPipe.name + '-dropped';
        cpPipe.handle = function (v) {
          return v;
        };
      }
      var out = _execSyncPipe(item, cpPipe);
      keep && output.push(out);
    });
    return output;
  }

  function _execSyncReducePipe(pipeInput, pipe) {
    pipeInput = [].concat(pipeInput);
    return _execSyncPipe(pipeInput, _extends({}, pipe, {
      handle: function handle(iPipeInput) {
        return iPipeInput.reduce(pipe.handle, pipe.initialValue);
      }
    }));
  }

  function _execSyncPipe(pipeInput, pipe) {
    return _execSyncPipeWithMiddlewares(pipe.middlewares, _warpPipeState(pipeInput, pipe));
  }

  function _execAsyncPipe(pipeInput) {
    var pipe = _asyncPipeQueue[0];
    var name = pipe.name;
    var _pipe$middlewares2 = pipe.middlewares;
    var middlewares = _pipe$middlewares2 === undefined ? [] : _pipe$middlewares2;

    var preState = _execPipeMiddleware(middlewares, _warpPipeState(pipeInput, pipe), 'pre');
    if (preState.skip) return;

    var promise = preState.pipe.handle(preState.value);
    if (!(promise && promise.then instanceof Function && promise.catch instanceof Function)) {
      throw new Error('\n        [pipelineWrap.flowAsync][' + name + '] accept a `Function(pipeState)`\n        should return Promise instance!\n      ');
    }

    _blocking = true;

    promise.then(function (data) {
      var postState = _execPipeMiddleware(middlewares, _extends({}, preState, { value: data }), 'post');

      var output = postState.value;
      _blocking = false;

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _syncPipesAfterAsync.get(pipe)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var syncPipeObj = _step.value;

          output = _execAllSyncPipe(output, syncPipeObj);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      _asyncPipeQueue.shift();
      _syncPipesAfterAsync.delete(pipe);

      if (_asyncPipeQueue.length) {
        _execAsyncPipe(output);
      } else {
        _handleSuccFinish(output);
      }
    }).catch(function (err) {
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
    _console('group')('\n* Run Middlewar Group');
    _console()('inputState: ', inputState, type);

    var outputState = inputState;

    if (middlewares.length) {
      outputState = middlewares.reduce(function (state, middleware) {
        _console()(' + Run Middlewar ' + middleware.name + ' ' + type + ' Handler: ');
        _console()('   - State: ', state);

        assertState(state);
        assertMiddleware(middleware, type);
        handle && handle(middleware);
        var newState = middleware[type] ? middleware[type](state) : state;

        _console()('   - NextState: ', newState);
        return newState;
      }, inputState);
    }
    _console('groupEnd')('* End Middlewar Group\n');
    return outputState;
  }

  function _execSyncPipeWithMiddlewares(middlewares, inputState) {
    var preState = _execPipeMiddleware(middlewares, inputState, 'pre');
    var outputState = _extends({}, preState);
    if (!preState.skip) outputState.value = preState.pipe.handle(preState.value);
    var newState = _execPipeMiddleware(middlewares.reverse(), outputState, 'post');
    return newState.value;
  }

  function _warpPipeState() {
    var value = arguments.length <= 0 || arguments[0] === undefined ? _output : arguments[0];
    var pipe = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    return { name: _pipelineName, value: value, pipe: pipe, skip: false };
  }

  function _console() {
    var type = arguments.length <= 0 || arguments[0] === undefined ? 'log' : arguments[0];

    var logger = console[type] ? console[type] : console.log; // eslint-disable-line no-console
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

function BreakPipeline(message) {
  this.name = 'BreakPipeline';
  this.message = message || '';
}

BreakPipeline.prototype = Error.prototype;
},{}],5:[function(require,module,exports){
var Pipeline = require('../../dist/pipeline').default;
var PipelineLogger = require('../../dist/pipeline/middlewares/logger').default;

Pipeline.pipelineMiddlewares.push(PipelineLogger);

var pl = new Pipeline('myPipeline', [
  {name: 'pipe1', handle: v => 1 / v},
  {
    name: '2times',
    type: 'flowAsync',
    handle: v => {
      return new Promise((resolve, reject) => {
        setTimeout(() => resolve(v * 2));
      });
    }
  },
  {name: 'plus', handle: v => v + 0.1}
]);

pl.flow(10);

},{"../../dist/pipeline":1,"../../dist/pipeline/middlewares/logger":2}]},{},[5]);
