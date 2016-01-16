export let PipeLoggerMiddleware = {
  type: 'pipe',
  name: 'PipeLoggerMiddleware',
  pre(state) {
    logPipe(state);
    return state;
  },
  post(state) {
    logPipe(state, true);
    return state;
  }
};

let PipelineLoggerMiddleware = {
  type: 'pipeline',
  name: 'PipelineLoggerMiddleware',
  pre(state) {
    _console('groupCollapsed')(state.name || 'Pipeline');
    state.middlewareStack.length && _console('info')('PrePipeline', state);
    return state;
  },
  post(state) {
    state.middlewareStack.length && _console('info')('postPipeline', state);
    _console('groupEnd')();
    return state;
  },
  pipeMiddleware: PipeLoggerMiddleware
};

function _console(type='log') {
  if (!console) return;
  return (console[type] || console.log).bind(console); // eslint-disable-line no-console
}

function logPipe(state, isOutput=false) {
  let logger = isOutput ? 'log' : 'info';
  let type = isOutput ? 'out' : ' in';
  let handlerType = isOutput ? 'post' : 'pre';
  let name = state.pipe.name || 'pipe' + state.pipe.order;
  let logState = Object.assign({}, state);
  logState.middlewareStack = state.middlewareStack.concat({
    handlerType, PipeLoggerMiddleware,
    inputState: state, outputState: state
  });

  name = isOutput ? name.replace(/./g, ' ') : name;
  if (isBrowser()) {
    _console(logger)(
      `%c${name} %c${type} %c${logState.value}`,
      'color: #26C6DA', 'color: #555', 'color: #26A69A',
      logState);
  } else {
    _console(logger)(`${name} ${type} ${logState.value}`, logState);
  }
}

function isBrowser() {
  return !!console.groupCollapsed; // eslint-disable-line no-console
}

export default PipelineLoggerMiddleware;
