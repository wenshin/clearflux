import {assert} from 'chai';
import Store from '../lib/store';

const ASYNC_TEST_DELAY = 10;

describe('store:combineLoadings', function () {
  let store = new Store({a: 0});
  let store1 = new Store({a: 1});
  let store2 = new Store({a: 2});
  let triggerValues = [];
  let onChange = value => triggerValues.push(value.loading);
  store.combineLoadings('globalLoading', [['a', store1], ['a', store2]]);

  beforeEach(() => {
    triggerValues = [];
    store.onChange('globalLoading', onChange);
  });

  afterEach(() => {
    store.offChange('globalLoading', onChange);
    store.stopLoading('globalLoading');
    store1.stopLoading('a');
    store2.stopLoading('a');
  });


  it('should loading and end loading one store right', done => {
    store1.startLoading('a');

    setTimeout(() => {
      store1.stopLoading('a');
    }, ASYNC_TEST_DELAY);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [false, true, false]);
      done();
    }, ASYNC_TEST_DELAY * 2);
  });

  it('loading two store and end loading one store should right', done => {
    store1.startLoading('a');
    store2.startLoading('a');

    setTimeout(() => {
      store1.stopLoading('a');
    }, ASYNC_TEST_DELAY);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      // 第三次因为仍然是 loading 状态所以不触发第三次事件
      assert.deepEqual(triggerValues, [false, true]);
      done();
    }, ASYNC_TEST_DELAY * 2);
  });

  it('loading two store and end loading two store should right ', done => {
    store1.startLoading('a');
    store2.startLoading('a');

    setTimeout(() => {
      store1.stopLoading('a');
      store2.stopLoading('a');
    }, ASYNC_TEST_DELAY);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      // 第三次因为仍然是 loading 状态所以不触发第三次事件
      assert.deepEqual(triggerValues, [false, true, false]);
      done();
    }, ASYNC_TEST_DELAY * 2);
  });
});
