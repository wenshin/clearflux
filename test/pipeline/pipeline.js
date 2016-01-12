import {assert} from 'chai';
import Pipeline from '../../lib/pipeline';

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
});
