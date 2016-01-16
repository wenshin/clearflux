export let PipeLoggerMiddleware = {
  type: 'pipe',
  name: 'PipeLoggerMiddleware',
  pre(pipeState) {
    _logPipe(pipeState);
    return {...pipeState, skip: false};
  },
  post(pipeState) {
    _logPipe(pipeState, true);
    return pipeState;
  }
};

let PipelineLoggerMiddleware = {
  type: 'pipeline',
  name: 'PipelineLoggerMiddleware',
  pre(pipeState) {
    _console('groupCollapsed')(pipeState.name || 'Pipeline');
    return pipeState;
  },
  post(pipeState) {
    _console('groupEnd')();
    return pipeState;
  },
  pipeMiddleware: PipeLoggerMiddleware
};

function _console(type='log') {
  if (!console) return;
  return (console[type] || console.log).bind(console); // eslint-disable-line no-console
}

function _logPipe(state, isOutput=false) {
  let logger = isOutput ? 'log' : 'info';
  let type = isOutput ? 'out' : ' in';
  let name = state.pipe.name || 'pipe' + state.pipe.order;
  name = isOutput ? name.replace(/./g, ' ') : name;
  _console(logger)(
    `%c${name} %c${type} %c${state.value}`,
    'color: #26C6DA', 'color: #555', 'color: #26A69A',
    state);
}

export default PipelineLoggerMiddleware;
