import {assert} from 'chai';
import clearflux, {
  Store, Actions, StoreParamNeedError
} from '../lib';

describe('clearflux', function () {
  it('should have all props!', function () {
    assert.ok(clearflux.createStore);
    assert.ok(clearflux.createActions);
    assert.ok(Store);
    assert.ok(Actions);
    assert.ok(StoreParamNeedError);
  });

  let hasInitStore = false;
  let store = clearflux.createStore({a: 1});
  let actions =clearflux.createActions(store, {
    initStore() {
      hasInitStore = true;
    },
    testPutStore() {
      this.putStore('a', 'put');
    },
    testPatchStore() {
      this.patchStore({a: 'patch'});
    },
    testStartLoading() {
      this.startLoading('a');
    },
    testStopLoading() {
      this.stopLoading('a');
    },
    testSetErrors() {
      this.setErrors('a', 'error');
    },
    testRemoveErrors() {
      this.removeErrors('a');
    }
  });

  it('should createActions and initStore right!', function() {
    assert.ok(hasInitStore);
  });

  it('should action.putStore ok!', function(done) {
    let changeResult = [];
    store.onChange('a', s => changeResult.push(s));
    actions.testPutStore();
    setTimeout(() => {
      assert.deepEqual(changeResult, [
        {value: 1, errors: [], loading: false},
        {value: 'put', errors: [], loading: false}
      ]);
      done();
    }, 5);
  });

  it('should action.patchStore ok!', function(done) {
    let changeResult = [];
    store.onChange('a', s => changeResult.push(s));
    actions.testPatchStore();
    setTimeout(() => {
      assert.deepEqual(changeResult, [
        {value: 'put', errors: [], loading: false},
        {value: 'patch', errors: [], loading: false}
      ]);
      done();
    }, 5);
  });

  it('should action.startLoading ok!', function(done) {
    let changeResult = [];
    store.onChange('a', s => changeResult.push(s));
    actions.testStartLoading();
    setTimeout(() => {
      assert.deepEqual(changeResult, [
        {value: 'patch', errors: [], loading: false},
        {value: 'patch', errors: [], loading: true}
      ]);
      done();
    }, 5);
  });

  it('should action.stopLoading ok!', function(done) {
    let changeResult = [];
    store.onChange('a', s => changeResult.push(s));
    actions.testStopLoading();
    setTimeout(() => {
      assert.deepEqual(changeResult, [
        {value: 'patch', errors: [], loading: true},
        {value: 'patch', errors: [], loading: false}
      ]);
      done();
    }, 5);
  });

  it('should action.setErrors ok!', function(done) {
    let changeResult = [];
    store.onChange('a', s => changeResult.push(s));
    actions.testSetErrors();
    setTimeout(() => {
      assert.deepEqual(changeResult, [
        {value: 'patch', errors: [], loading: false},
        {value: 'patch', errors: ['error'], loading: false}
      ]);
      done();
    }, 5);
  });

  it('should action.removeErrors ok!', function(done) {
    let changeResult = [];
    store.onChange('a', s => changeResult.push(s));
    actions.testRemoveErrors();
    setTimeout(() => {
      assert.deepEqual(changeResult, [
        {value: 'patch', errors: ['error'], loading: false},
        {value: 'patch', errors: [], loading: false}
      ]);
      done();
    }, 5);
  });
});
