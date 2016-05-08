import {assert} from 'chai';
import Store from '../lib/store';

const ASYNC_TEST_DELAY = 10;

describe('store:combineLoadings', function () {
  let store = new Store({a: 0});
  let store1 = new Store({a: 1});
  let store2 = new Store({a: 2});
  let action = {name: 'combineAction'};
  let triggerValues = [];
  let onChange = value => triggerValues.push(value.loading);
  store.registerWriter(action);
  store1.registerWriter(action);
  store2.registerWriter(action);
  store.combineLoadings('globalLoading', [['a', store1], ['a', store2]]);

  beforeEach(() => {
    triggerValues = [];
    store.onChange('globalLoading', onChange);
  });

  afterEach(() => {
    store.offChange('globalLoading', onChange);
    store.stopLoading('globalLoading', action);
    store1.stopLoading('a', action);
    store2.stopLoading('a', action);
  });


  it('should loading and end loading one store right', done => {
    store1.startLoading('a', action);

    setTimeout(() => {
      store1.stopLoading('a', action);
    }, ASYNC_TEST_DELAY);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [false, true, false]);
      done();
    }, ASYNC_TEST_DELAY * 2);
  });

  it('loading two store and end loading one store should right', done => {
    store1.startLoading('a', action);
    store2.startLoading('a', action);

    setTimeout(() => {
      store1.stopLoading('a', action);
    }, ASYNC_TEST_DELAY);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      // 第三次因为仍然是 loading 状态所以不触发第三次事件
      assert.deepEqual(triggerValues, [false, true]);
      done();
    }, ASYNC_TEST_DELAY * 2);
  });

  it('loading two store and end loading two store should right ', done => {
    store1.startLoading('a', action);
    store2.startLoading('a', action);

    setTimeout(() => {
      store1.stopLoading('a', action);
      store2.stopLoading('a', action);
    }, ASYNC_TEST_DELAY);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      // 第三次因为仍然是 loading 状态所以不触发第三次事件
      assert.deepEqual(triggerValues, [false, true, false]);
      done();
    }, ASYNC_TEST_DELAY * 2);
  });
});
