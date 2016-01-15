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
