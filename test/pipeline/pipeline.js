import {assert} from 'chai';
import Pipeline from '../../lib/pipeline';
import PipelineLogger from '../../lib/pipeline/middlewares/logger';

describe('Pipeline', function () {
  it('应该正确运行委托自 Array 的方法', function () {
    let pipeline = new Pipeline(
      'Pipeline Array test',
      [
        {name: 'pipe1', handle: v => v},
        {name: 'Negative', handle: v => -v}
      ]
    );

    assert.equal(pipeline.flow(10), -10);

    pipeline.push({name: 'MultiplicativeInverse', handle: v => 1 / v});

    assert.equal(pipeline.flow(10), -0.1);
  });

  it('应该正确运行 Logger 中间件', function () {
    let pipeline = new Pipeline(
      'Pipeline Logger test',
      [
        {name: 'pipe1', handle: v => v},
        {name: 'Negative', handle: v => -v}
      ]
    );
    Pipeline.pipelineMiddlewares.push(PipelineLogger);
    assert.equal(pipeline.flow(10), -10);
    Pipeline.pipelineMiddlewares = [];
  });

});
