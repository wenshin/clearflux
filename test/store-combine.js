import {assert} from 'chai';
import Store from '../lib/store';

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
