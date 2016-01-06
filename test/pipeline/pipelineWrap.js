import {assert} from 'chai';
import {pipelineWrap} from '../../lib/pipeline';
import {makeRoundNumberMixin, toNumberMixin} from '../../lib/pipeline/mixins/number';

describe('pipelineWrap', function () {
  it('应该正确运行非异步方法', function () {
    let except = pipelineWrap('10', {mixins: [toNumberMixin]})
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
    let promise = pipelineWrap(10)
      .flow(v => -v)
      .flowAsync(asyncPipe)
      .flow(v => 1/v)
      .flowAsync(asyncPipe)
      .flow(v => v * 3)
      .finish({mixins: [makeRoundNumberMixin()]});
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
    let except = pipelineWrap(10)
      .flow(v => [1*v, 2*v])
      .mapFlow(v => 1/v)
      .reduceFlow({
        pipe: (pre, cur) => pre + cur,
        initialValue: 0,
        postMixins: [makeRoundNumberMixin()]
      })
      .finish();
    assert.equal(except, 0.15);
  });

});
