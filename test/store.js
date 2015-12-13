import assert from 'assert';
import { StoreWritePermissionError } from '../lib/error';
import Store from '../lib/store';

describe('store', function () {

  it('should not put values directly!', function () {
    let store = new Store({a: 1, b: {c: 1}});
    assert.throws(() => store.put('a', 2), StoreWritePermissionError);

    let action = {};
    store.registerWriter(action);
    assert.doesNotThrow(() => store.put('a', 2, action), StoreWritePermissionError);
  });

  it('should get default values deeply copied', function() {
    let defaultValues = {a: 1, b: {c: 1}};
    let store = new Store(defaultValues);
    assert.notEqual(store.getDefault().b, defaultValues.b);
    assert.deepEqual(store.getDefault(), defaultValues);
  });

  it('should trigger root level property change event', function (done) {
    let store = new Store({a: 1, b: {c: 1}});
    let excepted = [
      // 绑定时即触发一次事件
      store.getDefault().b,
      // 事件更新时再一次触发事件
      {c: 2}
    ];
    store.onChange('b', value => {
      let exceptValue = excepted.shift();
      assert.notEqual(exceptValue, value);
      assert.deepEqual(exceptValue, value);
    });

    let action = {get: () => {}};
    store.registerWriter(action);
    store.put('b.c', 2, action);

    setTimeout(() => {
      assert.ok(!excepted.length, `值为“${excepted}”的事件没有触发`);
      done();
    }, 25);
  });

  it('should trigger multi watch right when put', function (done) {
    let store = new Store({a: 1, b: {c: 1}});
    let triggerValues = [];
    let bTriggerValues = [];
    store.onChange('b', b => {
      bTriggerValues.push(b);
    });

    store.onChange('a&b', (a, b) => {
      triggerValues.push([a, b]);
    });

    let action = {get: () => {}};
    store.registerWriter(action);
    store.put('b.c', 2, action);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [[1, {c: 1}], [1, {c: 2}]]);
      assert.deepEqual(bTriggerValues, [{c: 1}, {c: 2}]);
      done();
    }, 25);
  });

  it('should trigger multi watch right when patch', function (done) {
    let store = new Store({a: 1, b: {c: 1}});
    let triggerValues = [];
    store.onChange('a&b', (a, b) => {
      triggerValues.push([a, b]);
    });

    let action = {get: () => {}};
    store.registerWriter(action);
    store.patch({b: {d: 2}}, action);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [[1, {c: 1}], [1, {c: 1, d: 2}]]);
      done();
    }, 25);
  });

  it('should not trigger change event after offChange', function (done) {
    let store = new Store({a: 1, b: {c: 1}});
    let triggerValues = [];
    let handler = (a, b) => {
      triggerValues.push([a, b]);
    };
    store.onChange('a&b', handler);
    store.offChange('a&b', handler);

    let action = {get: () => {}};
    store.registerWriter(action);
    store.patch({b: {d: 2}}, action);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [[1, {c: 1}]]);
      done();
    }, 25);
  });
});
