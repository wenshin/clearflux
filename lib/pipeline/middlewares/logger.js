export let PipeLoggerMiddleware = {
  type: 'pipe',
  name: 'PipeLoggerMiddleware',
  pre(pipeState) {
    let {name='', order=''} = pipeState.pipe;
    _console('info')(`${pipeState.value} >>> ${name || 'pipe' + order}`, pipeState);
    return {...pipeState, skip: true};
  },
  post(pipeState) {
    let {name='', order=''} = pipeState.pipe;
    _console('info')(`${pipeState.value} <<< ${name || 'pipe' + order}`, pipeState);
    return pipeState;
  }
};

let PipelineLoggerMiddleware = {
  type: 'pipeline',
  name: 'PipelineLoggerMiddleware',
  pre(pipeState) {
    _console('groupCollapsed')(`Start Pipeline: ${pipeState.name}`);
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

export default PipelineLoggerMiddleware;
