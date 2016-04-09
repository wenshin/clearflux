import {assert} from 'chai';
import { StoreWritePermissionError } from '../lib/error';
import Store from '../lib/store';

// NOTE: setTimeout 延时时间是经过试验设置的，如果修改可能会影响测试结果

describe('store', function () {
  let action = {};

  it('should not put values directly!', function () {
    let store = new Store({a: 1, b: {c: 1}});
    assert.throws(() => store.put('a', 2), StoreWritePermissionError);

    store.registerWriter(action);
    assert.doesNotThrow(() => store.put('a', 2, action), StoreWritePermissionError);
  });

  it('should get default values deeply copied', function() {
    let defaultValues = {a: 1, b: {c: 1}};
    let store = new Store(defaultValues);
    assert.notEqual(store.getDefault().b, defaultValues.b);
    assert.deepEqual(store.getDefault(), defaultValues);
  });

  it('should get all data deeply copied default when queries not supply', function() {
    let defaultValues = {a: 1, b: {c: 1}, d: [{a: 1}, {b: 2}]};
    let store = new Store(defaultValues);
    assert.notEqual(store.get().value.b, defaultValues.b);
    assert.deepEqual(store.get().value, defaultValues);
    assert.notEqual(store.get('d').value, defaultValues.d);
    assert.deepEqual(store.get('d').value, defaultValues.d);
    assert.deepEqual(store.get(['b', 'd']), [
      {value: defaultValues.b, loading: false, errors: []},
      {value: defaultValues.d, loading: false, errors: []}]);
  });

  it('should auto change loading status when put promise', function (done) {
    let PROMISE_DELAY = 15;
    let excepted = [];
    let exceptedLoadings = [];

    let promiseValue = new Promise((resolve) => {
      setTimeout(() => resolve(2), PROMISE_DELAY);
    });
    let store = new Store({a: 1, b: {c: 1}});

    store.onChange('b.c', s => excepted.push(s));
    store.onLoading('b.c', s => exceptedLoadings.push(s.loading));

    store.registerWriter(action);
    store.put('b.c', promiseValue, action);

    setTimeout(() => {
      assert.ok(excepted.length, `值为“${excepted}”的事件没有触发`);
      assert.ok(exceptedLoadings.length, `值为“${exceptedLoadings}”的事件没有触发`);
      assert.deepEqual(excepted, [
        {loading: false, errors: [], value: 1},
        {loading: true, errors: [], value: 1},
        {loading: false, errors: [], value: 2}
      ]);
      assert.deepEqual(exceptedLoadings, [false, true, false]);
      done();
    }, PROMISE_DELAY + 15); // 必须延长 > 10 秒的时间才能监听到 promise 结束的事件
  });

  it('should auto change error status when put promise', function (done) {
    let PROMISE_DELAY = 15;
    let excepted = [];
    let exceptedLoadings = [];
    let exceptedErrors = [];

    let promiseValue = new Promise((resolve, reject) => {
      setTimeout(() => reject('error'), PROMISE_DELAY);
    });
    let store = new Store({a: 1, b: {c: 1}});

    store.onChange('b.c', s => excepted.push(s));
    store.onLoading('b.c', s => exceptedLoadings.push(s.loading));
    store.onError('b.c', s => exceptedErrors.push(s.errors));

    store.registerWriter(action);
    store.put('b.c', promiseValue, action);

    setTimeout(() => {
      assert.ok(excepted.length, `值为“${excepted}”的事件没有触发`);
      assert.ok(exceptedLoadings.length, `值为“${exceptedLoadings}”的事件没有触发`);
      assert.deepEqual(excepted, [
        {loading: false, errors: [], value: 1},
        {loading: true, errors: [], value: 1},
        {loading: false, errors: ['error'], value: 1}
      ]);
      assert.deepEqual(exceptedLoadings, [false, true, false]);
      assert.deepEqual(exceptedErrors, [[], [], ['error']]);
      done();
    }, PROMISE_DELAY + 15); // 必须延长 > 10 秒的时间才能监听到 promise 结束的事件
  });

  it('should trigger root level property change event when no other events bind', function (done) {
    let store = new Store({a: 1, b: {c: 1}});

    let excepted = [
      // 绑定时即触发一次事件
      store.getDefault(),
      // b 更新时触发一次整个数据更新事件
      {a: 1, b: {c: 2}}
    ];
    store.onChange(function(s) {
      let exceptValue = excepted.shift();
      assert.notEqual(exceptValue, s.value);
      assert.deepEqual(exceptValue, s.value);
      // this is the store object
      assert.equal(this. store);
    });

    store.registerWriter(action);
    store.put('b.c', 2, action);

    setTimeout(() => {
      assert.ok(!excepted.length, `值为“${excepted}”的事件没有触发`);
      done();
    }, 20);
  });

  it('should trigger root level property change event', function (done) {
    let store = new Store({a: 1, b: {c: 1}});

    let excepted = [
      // 绑定时即触发一次事件
      store.getDefault().b,
      // 事件更新时再一次触发事件
      {c: 2}
    ];
    store.onChange('b', function(b) {
      let exceptValue = excepted.shift();
      assert.notEqual(exceptValue, b.value);
      assert.deepEqual(exceptValue, b.value);
      // this is the store object
      assert.equal(this. store);
    });

    let allExcepted = [
      // 绑定时即触发一次事件
      store.getDefault(),
      // b 更新时触发一次整个数据更新事件
      {a: 1, b: {c: 2}}
    ];
    store.onChange(function(s) {
      let exceptValue = allExcepted.shift();
      assert.notEqual(exceptValue, s.value);
      assert.deepEqual(exceptValue, s.value);
      // this is the store object
      assert.equal(this. store);
    });

    store.registerWriter(action);
    store.put('b.c', 2, action);

    setTimeout(() => {
      assert.ok(!allExcepted.length, `整个数据，值为“${allExcepted}”的事件没有触发`);
      assert.ok(!excepted.length, `值为“${excepted}”的事件没有触发`);
      done();
    }, 20);
  });

  it('should trigger multi watch right when put', function (done) {
    let store = new Store({a: 1, b: {c: {}}});
    let triggerValues = [];
    let bTriggerValues = [];
    store.onChange('b', b => {
      bTriggerValues.push(b.value);
    });

    store.onChange('b.c', (c) => {
      triggerValues.push(c.value);
    });

    store.registerWriter(action);
    store.put('b', {c: {d: 2}}, action);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [{}, {d: 2}]);
      assert.deepEqual(bTriggerValues, [{c: {}}, {c: {d: 2}}]);
      done();
    }, 20);
  });

  it('should trigger multi watch right when patch', function (done) {
    let store = new Store({a: 1, b: {c: 1}});
    let triggerValues = [];
    store.onChange('a&b', (a, b) => {
      triggerValues.push([a.value, b.value]);
    });

    store.registerWriter(action);
    store.patch({b: {d: 2}}, action);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [[1, {c: 1}], [1, {c: 1, d: 2}]]);
      done();
    }, 20);
  });

  it('should not trigger change event after offChange', function (done) {
    let store = new Store({a: 1, b: {c: 1}});
    let triggerValues = [];
    let handler = (a, b) => {
      triggerValues.push([a.value, b.value]);
    };
    store.onChange('a&b', handler);
    store.offChange('a&b', handler);

    store.registerWriter(action);
    store.patch({b: {d: 2}}, action);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [[1, {c: 1}]]);
      done();
    }, 20);
  });

  it('should trigger change event when set loading and stop loading', function (done) {
    let store = new Store({a: 1, b: {c: 1}});
    let triggerValues = [];
    store.onChange('b', b => {
      triggerValues.push(b);
    });
    store.registerWriter(action);
    store.startLoading('b', action);

    setTimeout(() => {
      store.stopLoading('b', action);
      store.setErrors('b', 'errors', action);
    }, 20);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [
        {loading: false, errors: [], value: {c: 1}},
        {loading: true, errors: [], value: {c: 1}},
        // 两个连续的改变，只触发一次事件
        {loading: false, errors: ['errors'], value: {c: 1}}
      ]);
      done();
    }, 40);
  });

  it('should trigger change event when set erros and remove errors', function (done) {
    let store = new Store({a: 1, b: {c: 1}});
    let triggerValues = [];
    store.onChange('b', b => {
      triggerValues.push(b);
    });
    store.registerWriter(action);
    store.setErrors('b', 'errors', action);

    setTimeout(() => {
      store.removeErrors('b', action);
    }, 20);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [
        {loading: false, errors: [], value: {c: 1}},
        {loading: false, errors: ['errors'], value: {c: 1}},
        {loading: false, errors: [], value: {c: 1}}
      ]);
      done();
    }, 40);
  });

  it('should reset loading and errors when put data', done => {
    let store = new Store({a: 1, b: {c: 1}});
    let triggerValues = [];
    store.onChange('b', b => {
      triggerValues.push(b);
    });
    store.registerWriter(action);

    store.setErrors('b', 'errors', action);
    store.startLoading('b', action);
    store.put('b', {c: 2}, action);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [
        {loading: false, errors: [], value: {c: 1}},
        {loading: false, errors: [], value: {c: 2}}
      ]);
      done();
    }, 30);
  });
});

describe('store:combine', function () {
  let action = {name: 'combineAction'};
  let store;

  let triggerValues = [];
  let handleChange = v => triggerValues.push(v);

  beforeEach(() => {
    store = new Store({a: 1, b: 2});
    store.combine({
      ab: {queries: ['a', 'b'], get: (a, b) => a + b},
      ab1: {queries: ['a', 'b'], get: (a, b) => a - b}
    });
    store.registerWriter(action);
    triggerValues = [];
  });

  it('should combine props to one and can trigger change event', done => {
    store.onChange('ab', handleChange);

    store.put('a', 3, action);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [
        {value: 3, loading: false, errors: []},
        {value: 5, loading: false, errors: []}
      ]);
      store.offChange('ab', handleChange);
      done();
    }, 20);
  });

  it('should trigger loading event right', done => {
    store.onChange('ab1', handleChange);

    store.startLoading('a', action);

    setTimeout(() => {
      store.stopLoading('a', action);
    }, 20);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [
        {value: -1, loading: false, errors: []},
        {value: -1, loading: true, errors: []},
        {value: -1, loading: false, errors: []}
      ]);
      store.offChange('ab1', handleChange);
      done();
    }, 40);
  });

  it('should trigger errors event right', done => {
    store.onChange('ab1', v => handleChange(v));

    store.setErrors('a', 'error', action);

    setTimeout(() => {
      store.removeErrors('a', action);
    }, 20);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [
        {value: -1, loading: false, errors: []},
        {value: -1, loading: false, errors: ['error']},
        {value: -1, loading: false, errors: []}
      ]);
      store.offChange('ab1', handleChange);
      done();
    }, 40);
  });

  it('should trigger change events when mix operation', done => {
    store.onChange('ab1', v => handleChange(v));

    store.put('a', 3, action);
    store.startLoading('a', action);

    setTimeout(() => {
      store.stopLoading('a', action);
      store.setErrors('b', 'error', action);
    }, 20);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [
        {value: -1, loading: false, errors: []},
        {value: 1, loading: true, errors: []},
        {value: 1, loading: false, errors: ['error']}
      ]);
      store.offChange('ab1', handleChange);
      done();
    }, 40);
  });
});

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
    }, 20);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [false, true, false]);
      done();
    }, 50);
  });

  it('loading two store and end loading one store should right', done => {
    store1.startLoading('a', action);
    store2.startLoading('a', action);

    setTimeout(() => {
      store1.stopLoading('a', action);
    }, 20);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      // 第三次因为仍然是 loading 状态所以不触发第三次事件
      assert.deepEqual(triggerValues, [false, true]);
      done();
    }, 50);
  });

  it('loading two store and end loading two store should right ', done => {
    store1.startLoading('a', action);
    store2.startLoading('a', action);

    setTimeout(() => {
      store1.stopLoading('a', action);
      store2.stopLoading('a', action);
    }, 20);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      // 第三次因为仍然是 loading 状态所以不触发第三次事件
      assert.deepEqual(triggerValues, [false, true, false]);
      done();
    }, 50);
  });
});
