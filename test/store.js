import assert from 'assert';
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
    store.onChange(function(b) {
      let exceptValue = allExcepted.shift();
      assert.notEqual(exceptValue, b.value);
      assert.deepEqual(exceptValue, b.value);
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
    let store = new Store({a: 1, b: {c: 1}});
    let triggerValues = [];
    let bTriggerValues = [];
    store.onChange('b', b => {
      bTriggerValues.push(b.value);
    });

    store.onChange('a&b', (a, b) => {
      triggerValues.push([a.value, b.value]);
    });

    store.registerWriter(action);
    store.put('b.c', 2, action);

    setTimeout(() => {
      assert.ok(triggerValues.length, `没有触发事件`);
      assert.deepEqual(triggerValues, [[1, {c: 1}], [1, {c: 2}]]);
      assert.deepEqual(bTriggerValues, [{c: 1}, {c: 2}]);
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
});

describe('store:combine', function () {
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
