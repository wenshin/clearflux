import {assert} from 'chai';
import pipelineWrap from '../../lib/pipeline/pipelineWrap';
import PipelineLoggerMiddleware from '../../lib/pipeline/middlewares/logger';
import {makeRoundNumberHandler, toNumberHandler} from '../../lib/pipeline/middlewares/number';

let RoundNumberPipelineMiddleware = {
  type: 'pipeline',
  name: 'RoundNumberPipelineMiddleware',
  post: makeRoundNumberHandler()
};

let RoundNumberPipeMiddleware = {
  type: 'pipe',
  name: 'RoundNumberPipeMiddleware',
  post: makeRoundNumberHandler()
};

let ToNumberPipelineMiddleware = {
  type: 'pipeline',
  name: 'ToNumberPipelineMiddleware',
  pre: toNumberHandler
};


describe('pipelineWrap', function () {
  it('应该正确运行非异步方法', function () {
    let except = pipelineWrap('10',
      {
        name: 'pipeline1',
        middlewares: [ToNumberPipelineMiddleware]
      })
      .flow(v => {
        if (typeof v !== 'number') throw new TypeError('not a number');
        return v;
      })
      .flow(v => -v)
      .flow(v => 1/v)
      .finish();
    assert.equal(except, -0.1);
  });

  it('应该正确运行异步方法', function (done) {
    let asyncPipe = data => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(data * 2);
        }, 10);
      });
    };
    let promise = pipelineWrap(10,
      {
        name: 'pipeline2',
        // middlewares: [RoundNumberPipelineMiddleware]
        middlewares: [RoundNumberPipelineMiddleware, PipelineLoggerMiddleware]
      })
      .flow(v => -v)
      .flowAsync(asyncPipe)
      .flow(v => 1/v)
      .flowAsync(asyncPipe)
      .flow(v => v * 3)
      .finish();
    assert.ok(promise instanceof Promise, '异步结果返回 Promise 对象');

    let except;
    promise
      .then(data => {
        except = data;
      });
    setTimeout(() => {
      assert.equal(except, -0.3);
      done();
    }, 30);
  });

  // it('应该正确处理异步管道出错', function (done) {});

  it('可以正确执行同步方法 mapFlow 和 reduceFlow', function () {
    // let except = pipelineWrap(10)
    let except = pipelineWrap(10, {middlewares: [PipelineLoggerMiddleware]})
      .flow(v => [1*v, 2*v, 3*v])
      .mapFlow({handle: v => 1/v, filter: v => v < 30})
      .reduceFlow({
        handle: (pre, cur) => pre + cur,
        initialValue: 0,
        middlewares: [RoundNumberPipeMiddleware]
      })
      .finish();
    assert.equal(except, 0.15);
  });

});
