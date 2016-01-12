export let PipeLogger = {
  type: 'pipe',
  name: 'PipeLoggerMiddleware',
  pre() {},
  post() {}
};

let PipelineLogger = {
  type: 'pipeline',
  name: 'PipelineLoggerMiddleware',
  pre() {},
  post() {},
  pipeMiddleware: PipeLogger
};

function gGetLogger(verbose=false) {
  return type => () => {
    console && verbose && console[type] && console[type].apply(console, arguments); // eslint-disable-line no-console
  };
}

export default PipelineLogger;
