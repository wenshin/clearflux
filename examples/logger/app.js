var Pipeline = require('../../dist/pipeline').default;
var PipelineLogger = require('../../dist/pipeline/middlewares/logger').default;
var makeRoundNumberHandler = require('../../dist/pipeline/middlewares/number').makeRoundNumberHandler;

Pipeline.pipelineMiddlewares.push(PipelineLogger);

var RoundNumberPipeMiddleware = {
  type: 'pipe',
  name: 'RoundNumberPipeMiddleware',
  post: makeRoundNumberHandler()
};

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
  {handle: v => [1, 2, 3]},
  {name: 'map', handle: v => 1/v, filter: v => v < 30, type: 'mapFlow'},
  {
    name: 'reduce',
    type: 'reduceFlow',
    handle: (pre, cur) => pre + cur,
    initialValue: 0,
    middlewares: [RoundNumberPipeMiddleware]
  },
  {name: 'plus', handle: v => v + 0.1}
]);

pl.flow(10);
